/**
 * Transaction format conversion utilities for frontend wallet integration
 *
 * MCP tools output simplified transaction JSON structures. CSPR.click wallet
 * needs properly formatted Deploy JSON. This utility handles the conversion
 * using SDK builders to reconstruct transactions.
 *
 * Pattern derived from mcp-server/src/utils/signing.ts
 */

// Fix for ESM/CommonJS interop - casper-js-sdk is CommonJS
import casperSdk from "casper-js-sdk";

const {
  PublicKey,
  ContractCallBuilder,
  NativeTransferBuilder,
  Args,
  Key,
  CLValue,
  Deploy,
} = casperSdk;

/**
 * SDK-produced transaction JSON structure (from MCP tools)
 * This matches the format from mcp-server's build_* tools
 */
export interface SdkTransactionJson {
  hash?: string;
  header: {
    account: string;
    body_hash?: string;
    chain_name: string;
    dependencies?: string[];
    gas_price: number;
    timestamp?: string;
    ttl: string;
  };
  payment: {
    module_bytes?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown; bytes?: string }]>;
    };
    ModuleBytes?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown; bytes?: string }]>;
    };
  };
  session: {
    transfer?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
    };
    Transfer?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
    };
    stored_contract_by_hash?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      entry_point: string;
      hash: string;
      hash_type?: 'package' | 'contract';
    };
    StoredContractByHash?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      entry_point: string;
      hash: string;
    };
    stored_contract_by_name?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      entry_point: string;
      name: string;
    };
    StoredContractByName?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      entry_point: string;
      name: string;
    };
    module_bytes?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      module_bytes: string;
    };
    ModuleBytes?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown }]>;
      module_bytes: string;
    };
  };
  approvals?: Array<{ signer: string; signature: string }>;
}

/**
 * Decode a CLValue U512 from hex bytes
 * Format: length prefix byte + little-endian value bytes
 */
function decodeU512Bytes(hexBytes: string): bigint {
  const hex = hexBytes.startsWith('0x') ? hexBytes.slice(2) : hexBytes;
  const length = parseInt(hex.slice(0, 2), 16);
  const valueHex = hex.slice(2, 2 + length * 2);
  const bytes: string[] = [];
  for (let i = 0; i < valueHex.length; i += 2) {
    bytes.push(valueHex.slice(i, i + 2));
  }
  const bigEndianHex = bytes.reverse().join('');
  return BigInt('0x' + bigEndianHex);
}

/**
 * Parse payment amount from transaction JSON
 * Handles both decimal strings and CLValue hex bytes
 */
function parsePaymentAmount(amountValue: { parsed?: unknown; bytes?: string }): number {
  // Try bytes field first (CLValue format)
  if (amountValue.bytes && typeof amountValue.bytes === 'string') {
    try {
      return Number(decodeU512Bytes(amountValue.bytes));
    } catch {
      // Fall through to parsed
    }
  }

  // Try parsed field
  if (amountValue.parsed !== undefined) {
    const parsed = String(amountValue.parsed);

    // Check if it looks like hex bytes (starts with length prefix pattern)
    if (/^[0-9a-fA-F]+$/.test(parsed) && parsed.length >= 4) {
      const firstByte = parseInt(parsed.slice(0, 2), 16);
      if (firstByte >= 1 && firstByte <= 10 && parsed.length === 2 + firstByte * 2) {
        try {
          return Number(decodeU512Bytes(parsed));
        } catch {
          // Fall through to decimal parse
        }
      }
    }

    // Try as decimal string
    const decimal = parseInt(parsed, 10);
    if (!isNaN(decimal) && decimal > 0) {
      return decimal;
    }
  }

  // Default: 0.1 CSPR
  return 100000000;
}

/**
 * Parse TTL string to milliseconds
 * Supports: "30m", "1h", "60s", "1800000ms", or raw number
 */
function parseTtlToMilliseconds(ttl: string): number {
  if (/^\d+$/.test(ttl)) {
    return parseInt(ttl, 10);
  }

  const match = ttl.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
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
 * Reconstruct Transaction object from MCP tool output
 *
 * Converts simplified JSON structure to proper SDK Transaction object
 * using builder pattern (same as backend signing utilities).
 */
function reconstructTransaction(transactionJson: SdkTransactionJson): any {
  try {
    const senderKey = PublicKey.fromHex(transactionJson.header.account);
    const chainName = transactionJson.header.chain_name;

    // Parse payment amount - check both lowercase and PascalCase
    let paymentAmount = 100000000; // Default: 0.1 CSPR
    const paymentArgs = transactionJson.payment?.module_bytes?.args ||
                        transactionJson.payment?.ModuleBytes?.args;
    if (paymentArgs) {
      const amountArg = paymentArgs.find(
        ([key]: [string, any]) => key === 'amount'
      );
      if (amountArg && amountArg[1]) {
        paymentAmount = parsePaymentAmount(amountArg[1] as { parsed?: unknown; bytes?: string });
      }
    }

    let builder;

    // Check both lowercase and PascalCase session variants
    const transfer = transactionJson.session.transfer || transactionJson.session.Transfer;
    const storedContractByHash = transactionJson.session.stored_contract_by_hash ||
                                  transactionJson.session.StoredContractByHash;
    const storedContractByName = transactionJson.session.stored_contract_by_name ||
                                  transactionJson.session.StoredContractByName;
    const moduleBytes = transactionJson.session.module_bytes ||
                        transactionJson.session.ModuleBytes;

    // Determine transaction type and create appropriate builder
    if (transfer) {
      // Native CSPR transfer
      const transferArgs = (transfer as any).args;
      const amount = transferArgs.find(([key]: [string, any]) => key === 'amount')?.[1]?.parsed as string;
      const target = transferArgs.find(([key]: [string, any]) => key === 'target')?.[1]?.parsed as string;
      const id = transferArgs.find(([key]: [string, any]) => key === 'id')?.[1]?.parsed;

      builder = new NativeTransferBuilder()
        .from(senderKey)
        .target(PublicKey.fromHex(target))
        .amount(amount)
        .chainName(chainName)
        .ttl(parseTtlToMilliseconds(transactionJson.header.ttl))
        .payment(paymentAmount);

      if (id != null) {
        builder.id(Number(id));
      }

    } else if (storedContractByHash) {
      // Contract call
      const contractCall = storedContractByHash as any;
      const argsMap: Record<string, unknown> = {};

      // Convert args to proper CLValues
      for (const [key, value] of contractCall.args) {
        const clType = value.cl_type as string;
        const parsed = value.parsed;

        if (clType === "Key") {
          const parsedStr = parsed as string;
          if (parsedStr.startsWith('hash-')) {
            const keyObj = Key.newKey(parsedStr);
            argsMap[key] = CLValue.newCLKey(keyObj);
          } else if (parsedStr.startsWith('account-hash-')) {
            const keyObj = Key.newKey(parsedStr);
            argsMap[key] = CLValue.newCLKey(keyObj);
          } else {
            // Public key - convert to account-hash format
            const publicKey = PublicKey.fromHex(parsedStr);
            const accountHash = publicKey.accountHash();
            const keyStr = accountHash.toPrefixedString();
            const keyObj = Key.newKey(keyStr);
            argsMap[key] = CLValue.newCLKey(keyObj);
          }
        } else if (clType === "U256") {
          argsMap[key] = CLValue.newCLUInt256(BigInt(parsed as string));
        } else if (clType === "U512") {
          argsMap[key] = CLValue.newCLUInt512(BigInt(parsed as string));
        } else if (clType === "U128") {
          argsMap[key] = CLValue.newCLUInt128(BigInt(parsed as string));
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
          argsMap[key] = CLValue.newCLByteArray(Uint8Array.from(parsed as number[]));
        } else if (clType === "PublicKey") {
          const publicKey = PublicKey.fromHex(parsed as string);
          argsMap[key] = CLValue.newCLPublicKey(publicKey);
        } else {
          argsMap[key] = parsed;
        }
      }

      const hashType = contractCall.hash_type || 'package';
      builder = new ContractCallBuilder();

      if (hashType === 'package') {
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

    } else if (storedContractByName) {
      const contractCall = storedContractByName as any;
      throw new Error(`stored_contract_by_name for ${contractCall.name}/${contractCall.entry_point} is not supported. Use stored_contract_by_hash instead.`);

    } else if (moduleBytes) {
      throw new Error("module_bytes session type requires WASM bytes and is not supported in browser signing");
    } else {
      throw new Error("Unknown transaction type - must be transfer or stored_contract_by_hash");
    }

    // Build for Casper 1.5 (Deploy format) which testnet uses
    return builder.buildFor1_5();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reconstruct transaction: ${message}`);
  }
}

/**
 * Convert MCP Transaction V1 format to Deploy format for wallet signing
 *
 * This is the key conversion function that bridges MCP server output
 * (Transaction V1 JSON) with frontend wallet requirements (Deploy format).
 *
 * @param unsignedTransaction - Transaction V1 JSON from MCP tool's unsigned_deploy field
 * @returns Deploy format ready for CSPR.click wallet signing
 */
export function convertToDeployFormat(unsignedTransaction: object): object {
  try {
    // Check if this is already in Deploy format (PascalCase session keys)
    const tx = unsignedTransaction as any;
    if (tx.session) {
      const sessionKeys = Object.keys(tx.session);
      const hasPascalCaseVariant = sessionKeys.some(key =>
        key === 'Transfer' ||
        key === 'StoredContractByHash' ||
        key === 'StoredContractByName' ||
        key === 'ModuleBytes'
      );

      // If it's already in Deploy format and has proper structure, return as-is
      if (hasPascalCaseVariant && tx.hash && tx.header?.body_hash) {
        console.log('[transaction-utils] Deploy already in correct format, passing through');
        return unsignedTransaction;
      }
    }

    // Step 1: Reconstruct Transaction from simplified JSON using SDK builders
    console.log('[transaction-utils] Reconstructing transaction from MCP JSON...');
    const transaction = reconstructTransaction(unsignedTransaction as SdkTransactionJson);

    if (!transaction) {
      throw new Error("Failed to reconstruct transaction - builder returned null");
    }

    // Step 2: Convert to JSON for wallet signing
    // The Deploy object has a toJSON() method or we can use Deploy.toJSON(deploy)
    let deployJson: unknown;

    // Check if this is a Deploy object (has header, payment, session structure)
    const asDeploy = transaction as { header?: unknown; payment?: unknown; session?: unknown };
    if (asDeploy.header && asDeploy.payment && asDeploy.session) {
      // Use Deploy.toJSON static method for Deploy objects
      deployJson = Deploy.toJSON(transaction);
    } else if (typeof transaction.toJSON === 'function') {
      // Use instance toJSON method
      deployJson = transaction.toJSON();
    } else {
      throw new Error("Unable to serialize transaction: no toJSON method available");
    }

    console.log('[transaction-utils] Transaction converted to Deploy format');
    return deployJson as object;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Transaction format conversion failed: ${message}`);
  }
}

/**
 * Check if an unsigned transaction needs format conversion
 *
 * Transaction V1 format (MCP output) has these characteristics:
 * - Has 'header', 'payment', 'session' structure
 * - session uses lowercase keys (transfer, stored_contract_by_hash)
 *
 * Deploy format has these characteristics:
 * - Has 'hash' field at top level with computed hash
 * - Has 'header.body_hash' computed
 * - Uses PascalCase session variants (Transfer, StoredContractByHash)
 */
export function needsConversion(unsignedTransaction: any): boolean {
  if (!unsignedTransaction || typeof unsignedTransaction !== 'object') {
    return false;
  }

  // If it has session with lowercase keys, it needs conversion
  if (unsignedTransaction.session) {
    const sessionKeys = Object.keys(unsignedTransaction.session);
    const hasLowercaseVariant = sessionKeys.some(key =>
      key === 'transfer' ||
      key === 'stored_contract_by_hash' ||
      key === 'stored_contract_by_name' ||
      key === 'module_bytes'
    );
    if (hasLowercaseVariant) {
      return true;
    }
  }

  // If it doesn't have a computed hash or body_hash, it needs conversion
  if (!unsignedTransaction.hash || !unsignedTransaction.header?.body_hash) {
    return true;
  }

  return false;
}
