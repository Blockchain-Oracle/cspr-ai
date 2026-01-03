/**
 * Deploy signing and submission utilities
 *
 * Provides functionality for:
 * - Loading private keys from secret keys (PEM or hex format)
 * - Reconstructing Deploy objects from SDK-produced JSON for signing
 * - Signing deploys with a private key
 * - Submitting signed deploys to the network
 *
 * SECURITY NOTE: Secret keys should ONLY be loaded from environment variables
 * in stdio mode (Claude Desktop / MCP Studio). Never expose secret keys in
 * HTTP mode or pass them through tool parameters.
 */

import casperSdk from "casper-js-sdk";

const {
  PrivateKey,
  Deploy,
  Transaction,
  KeyAlgorithm,
  CLValue,
} = casperSdk;

// Type for private key and transaction from SDK
type PrivateKeyType = InstanceType<typeof PrivateKey>;
type TransactionType = InstanceType<typeof Transaction>;

/**
 * SDK-produced transaction JSON structure (via Transaction.toJSON())
 * This is the format produced by all our build_* tools
 * Uses PascalCase keys as per SDK serialization
 */
export interface SdkTransactionJson {
  hash?: string; // Optional - computed by SDK when signing
  header: {
    account: string;
    body_hash?: string; // Optional - computed by SDK when signing
    chain_name: string;
    dependencies?: string[]; // Optional - defaults to empty array
    gas_price: number;
    timestamp?: string; // Optional - computed by SDK when signing
    ttl: string;
  };
  payment: {
    module_bytes: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
    };
  };
  session: {
    transfer?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
    };
    stored_contract_by_hash?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      entry_point: string;
      hash: string;
      hash_type?: 'package' | 'contract';  // Indicates if calling by package hash or contract hash
    };
    stored_contract_by_name?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      entry_point: string;
      name: string;
    };
    module_bytes?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      module_bytes: string;
    };
  };
  approvals?: Array<{ signer: string; signature: string }>; // Optional - empty for unsigned
}

export interface SignedTransactionResult {
  transaction_hash: string;
  signed_transaction_json: string;
}

export interface SubmitTransactionResult {
  transaction_hash: string;
  status: "submitted";
  explorer_url: string;
}

/**
 * Detect key algorithm from PEM content
 */
function detectAlgorithmFromPem(pemContent: string): typeof KeyAlgorithm.ED25519 | typeof KeyAlgorithm.SECP256K1 {
  if (pemContent.includes("EC PRIVATE KEY") || pemContent.includes("secp256k1")) {
    return KeyAlgorithm.SECP256K1;
  }
  return KeyAlgorithm.ED25519;
}

/**
 * Parse TTL string to milliseconds
 * Supports formats like "30m", "1h", "60s", "1800000ms" or raw number
 */
function parseTtlToMilliseconds(ttl: string): number {
  // If it's already a number string (no suffix), assume milliseconds
  if (/^\d+$/.test(ttl)) {
    return parseInt(ttl, 10);
  }

  // Parse with suffix
  const match = ttl.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}. Expected format like "30m", "60s", "1h", or "1800000"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: throw new Error(`Unknown TTL unit: ${unit}`);
  }
}

/**
 * Load a private key from a secret key string
 *
 * Supports:
 * - PEM format (multi-line string starting with -----BEGIN)
 * - Hex format (64 char Ed25519 or 66 char Secp256k1 secret key)
 *
 * @param secretKey - The secret key in PEM or hex format
 * @returns The loaded private key
 * @throws Error if the secret key format is invalid
 */
export function loadPrivateKey(secretKey: string): PrivateKeyType {
  const trimmed = secretKey.trim();

  // Check if it's PEM format
  if (trimmed.startsWith("-----BEGIN")) {
    const algorithm = detectAlgorithmFromPem(trimmed);
    return PrivateKey.fromPem(trimmed, algorithm);
  }

  // Hex format - detect key type from length
  const hexKey = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;

  if (hexKey.length === 64) {
    // Ed25519 secret key (32 bytes = 64 hex chars)
    return PrivateKey.fromHex(hexKey, KeyAlgorithm.ED25519);
  } else if (hexKey.length >= 66) {
    // Secp256k1 secret key
    return PrivateKey.fromHex(hexKey, KeyAlgorithm.SECP256K1);
  }

  throw new Error(
    `Invalid secret key format. Expected PEM or hex format. Got ${hexKey.length} hex chars.`
  );
}

/**
 * Reconstruct a Transaction object from simplified build tool output
 *
 * Build tools output simplified structures without hash/timestamp/etc.
 * This function uses SDK builders to create proper Transaction objects.
 *
 * Supports:
 * - Native CSPR transfers (Transfer)
 * - Contract calls (StoredContractByHash)
 * - Contract deployments (ModuleBytes)
 *
 * @param transactionJson - The simplified transaction from any build_* tool
 * @returns A Transaction object ready for signing
 */
export function reconstructTransaction(transactionJson: SdkTransactionJson): TransactionType {
  try {
    const { PublicKey, ContractCallBuilder, NativeTransferBuilder, NativeDelegateBuilder, Args } = casperSdk;

    const senderKey = PublicKey.fromHex(transactionJson.header.account);
    const chainName = transactionJson.header.chain_name;

    // Parse payment amount from the transaction JSON
    let paymentAmount = 100000000; // Default: 0.1 CSPR in motes

    if (transactionJson.payment?.module_bytes?.args) {
      const amountArg = transactionJson.payment.module_bytes.args.find(
        ([key]: [string, any]) => key === 'amount'
      );
      if (amountArg && amountArg[1]?.parsed) {
        paymentAmount = parseInt(amountArg[1].parsed as string, 10);
      }
    }

    let builder;

    // Determine transaction type and create appropriate builder
    if (transactionJson.session.transfer) {
      // Native CSPR transfer
      const transferArgs = transactionJson.session.transfer.args;
      const amount = transferArgs.find(([key]) => key === 'amount')?.[1]?.parsed as string;
      const target = transferArgs.find(([key]) => key === 'target')?.[1]?.parsed as string;
      const id = transferArgs.find(([key]) => key === 'id')?.[1]?.parsed;

      builder = new NativeTransferBuilder()
        .from(senderKey)
        .target(PublicKey.fromHex(target))
        .amount(amount)
        .chainName(chainName)
        .ttl(parseTtlToMilliseconds(transactionJson.header.ttl))
        .payment(paymentAmount);

      if (id != null) {  // Checks both null and undefined
        builder.id(Number(id));
      }

    } else if (transactionJson.session.stored_contract_by_hash) {
      // Contract call
      const contractCall = transactionJson.session.stored_contract_by_hash;
      const argsMap: Record<string, unknown> = {};

      // Convert args array to map with proper CLValue construction
      for (const [key, value] of contractCall.args) {
        const clType = value.cl_type as string;
        const parsed = value.parsed;

        // Build proper CLValues based on type using SDK factory methods
        if (clType === "Key") {
          // Key type - can be PublicKey (account) or Hash (contract)
          const parsedStr = parsed as string;

          if (parsedStr.startsWith('hash-')) {
            // Contract hash - manually construct Key with Hash variant
            // Casper Key serialization: 1 byte variant tag + data
            // Hash variant tag = 0x01, followed by 32-byte hash
            const hashHex = parsedStr.replace('hash-', '');
            const hashBytes = Buffer.from(hashHex, 'hex');

            // Construct Key bytes: [0x01 (Hash tag), ...hash bytes]
            const keyBytes = Buffer.concat([
              Buffer.from([0x01]), // Hash variant tag
              hashBytes
            ]);

            // Create ByteArray CLValue (Key is represented as ByteArray in runtime args)
            argsMap[key] = CLValue.newCLByteArray(keyBytes);
          } else {
            // Public key (account)
            const publicKey = PublicKey.fromHex(parsedStr);
            argsMap[key] = CLValue.newCLPublicKey(publicKey);
          }
        } else if (clType === "U256") {
          argsMap[key] = CLValue.newCLUInt256(parsed as string);
        } else if (clType === "U512") {
          argsMap[key] = CLValue.newCLUInt512(parsed as string);
        } else if (clType === "U128") {
          argsMap[key] = CLValue.newCLUInt128(parsed as string);
        } else if (clType === "U64") {
          argsMap[key] = CLValue.newCLUint64(Number(parsed));
        } else if (clType === "U32") {
          argsMap[key] = CLValue.newCLUInt32(Number(parsed));
        } else if (clType === "U8") {
          argsMap[key] = CLValue.newCLUint8(Number(parsed));
        } else if (clType === "Bool") {
          argsMap[key] = CLValue.newCLValueBool(Boolean(parsed));
        } else if (clType === "String") {
          argsMap[key] = CLValue.newCLString(parsed as string);
        } else if (clType === "ByteArray") {
          // ByteArray - parsed should be an array of numbers
          const bytesArray = parsed as number[];
          argsMap[key] = CLValue.newCLByteArray(Uint8Array.from(bytesArray));
        } else {
          // For other types, try to use the parsed value directly
          argsMap[key] = parsed;
        }
      }

      // Use appropriate builder method based on hash type
      // Default to 'package' for backward compatibility (most common case)
      const hashType = contractCall.hash_type || 'package';

      // CRITICAL: Match SDK's method chain order exactly:
      // .byPackageHash() -> .from() -> .entryPoint() -> .chainName() -> .runtimeArgs() -> .ttl() -> .payment()
      builder = new ContractCallBuilder();

      // Call by package hash (contract-package-xxx) or by contract hash (hash-xxx)
      // IMPORTANT: This must come BEFORE .from() to match SDK pattern
      if (hashType === 'package') {
        // byPackageHash(hash, version?) - pass null to serialize as "version": null in JSON
        // TypedJSON omits undefined but includes null, and RPC expects explicit null field
        builder = builder.byPackageHash(contractCall.hash, null as unknown as number | undefined);
      } else {
        builder = builder.byHash(contractCall.hash);
      }

      builder = builder
        .from(senderKey)
        .entryPoint(contractCall.entry_point)
        .chainName(chainName)
        .runtimeArgs(Args.fromMap(argsMap as Record<string, never>))
        .ttl(parseTtlToMilliseconds(transactionJson.header.ttl))
        .payment(paymentAmount);

    } else if ((transactionJson.session as any).stored_contract_by_name) {
      // Check if this is a delegation to the auction contract
      const contractCall = (transactionJson.session as any).stored_contract_by_name;

      if (contractCall.name === 'auction' && contractCall.entry_point === 'delegate') {
        // Native delegation using NativeDelegateBuilder
        const delegateArgs = contractCall.args;
        const validatorArg = delegateArgs.find(([key]: [string, any]) => key === 'validator')?.[1]?.parsed as string;
        const amountArg = delegateArgs.find(([key]: [string, any]) => key === 'amount')?.[1]?.parsed as string;

        builder = new NativeDelegateBuilder()
          .from(senderKey)
          .validator(PublicKey.fromHex(validatorArg))
          .amount(amountArg)
          .chainName(chainName)
          .ttl(parseTtlToMilliseconds(transactionJson.header.ttl))
          .payment(paymentAmount);
      } else {
        // Other stored_contract_by_name calls not supported
        throw new Error(`stored_contract_by_name for ${contractCall.name}/${contractCall.entry_point} is not supported. Use stored_contract_by_hash instead.`);
      }

    } else if (transactionJson.session.module_bytes) {
      // Contract deployment not supported yet (requires WASM bytes)
      throw new Error("module_bytes session type requires WASM bytes and is not supported in signing tool yet");
    } else {
      throw new Error("Unknown transaction type - must be transfer, stored_contract_by_hash, or delegation");
    }

    // Build the transaction for Casper 2.0 network
    // .build() returns Transaction format with {hash, payload, approvals} structure
    const transaction = builder.build();

    if (!transaction) {
      throw new Error("Builder returned null/undefined");
    }

    // Transaction type has sign() method, so it's compatible with TransactionType
    return transaction as unknown as TransactionType;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reconstruct transaction: ${message}`);
  }
}

/**
 * Determine the transaction type from SDK JSON structure
 */
export function getTransactionType(transactionJson: SdkTransactionJson): "transfer" | "contract_call" | "module_bytes" | "unknown" {
  if (transactionJson.session.transfer) {
    return "transfer";
  }
  if (transactionJson.session.stored_contract_by_hash) {
    return "contract_call";
  }
  if (transactionJson.session.module_bytes) {
    return "module_bytes";
  }
  return "unknown";
}

/**
 * Sign a transaction with a private key
 *
 * @param transaction - The transaction to sign
 * @param privateKey - The private key to sign with
 * @returns The signed transaction
 */
export function signTransaction(
  transaction: TransactionType,
  privateKey: PrivateKeyType
): TransactionType {
  transaction.sign(privateKey);
  return transaction;
}

/**
 * Convert a signed transaction to JSON for submission
 *
 * @param signedTransaction - The signed transaction
 * @returns The transaction hash and JSON representation
 */
export function transactionToJson(
  signedTransaction: TransactionType
): SignedTransactionResult {
  // Get transaction hash - the hash object should have a toHex method or similar
  // If not, we convert from the raw bytes
  const hash = signedTransaction.hash;
  let transactionHash: string;
  if (typeof (hash as { toHex?: () => string }).toHex === 'function') {
    transactionHash = (hash as { toHex: () => string }).toHex();
  } else if (typeof (hash as { toJSON?: () => string }).toJSON === 'function') {
    transactionHash = (hash as { toJSON: () => string }).toJSON();
  } else {
    // Fallback: convert bytes to hex
    const bytes = hash as unknown as Uint8Array;
    transactionHash = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Use instance toJSON method for serialization
  // Transaction objects (from buildFor1_5) have their own toJSON instance method
  const transactionJson = (signedTransaction as unknown as { toJSON: () => unknown }).toJSON();

  return {
    transaction_hash: transactionHash,
    signed_transaction_json: JSON.stringify(transactionJson),
  };
}

/**
 * Get the secret key from environment variables
 *
 * Checks for:
 * - CASPER_SECRET_KEY: The secret key in PEM or hex format
 *
 * @returns The secret key or null if not configured
 */
export function getSecretKeyFromEnv(): string | null {
  return process.env.CASPER_SECRET_KEY || null;
}

/**
 * Check if wallet signing is available (secret key is configured)
 */
export function isWalletConfigured(): boolean {
  return getSecretKeyFromEnv() !== null;
}

/**
 * Get the public key hex from the configured wallet
 * Returns null if not configured or invalid
 */
export function getWalletPublicKey(): string | null {
  const secretKey = getSecretKeyFromEnv();
  if (!secretKey) return null;

  try {
    const privateKey = loadPrivateKey(secretKey);
    return privateKey.publicKey.toHex();
  } catch {
    return null;
  }
}
