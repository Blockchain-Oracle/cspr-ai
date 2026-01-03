/**
 * Transaction format conversion utilities for frontend wallet integration
 *
 * MCP tools output Casper 2.0 Transaction V1 format but frontend wallet/network
 * submission requires Casper 1.5 Deploy format. This utility handles conversion.
 *
 * Pattern derived from mcp-server/src/utils/signing.ts
 */

// Fix for ESM/CommonJS interop - casper-js-sdk is CommonJS
import casperSdk from "casper-js-sdk";

const {
  PublicKey,
  ContractCallBuilder,
  NativeTransferBuilder,
  NativeDelegateBuilder,
  Args,
  CLValue,
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
      hash_type?: 'package' | 'contract';
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
  approvals?: Array<{ signer: string; signature: string }>;
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

    // Parse payment amount
    let paymentAmount = 100000000; // Default: 0.1 CSPR
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

      if (id != null) {
        builder.id(Number(id));
      }

    } else if (transactionJson.session.stored_contract_by_hash) {
      // Contract call
      const contractCall = transactionJson.session.stored_contract_by_hash;
      const argsMap: Record<string, unknown> = {};

      // Convert args to proper CLValues
      for (const [key, value] of contractCall.args) {
        const clType = value.cl_type as string;
        const parsed = value.parsed;

        if (clType === "Key") {
          const parsedStr = parsed as string;
          if (parsedStr.startsWith('hash-')) {
            // Contract hash - construct Key bytes
            const hashHex = parsedStr.replace('hash-', '');
            const hashBytes = Buffer.from(hashHex, 'hex');
            const keyBytes = Buffer.concat([
              Buffer.from([0x01]), // Hash variant tag
              hashBytes
            ]);
            argsMap[key] = CLValue.newCLByteArray(keyBytes);
          } else {
            // Public key
            argsMap[key] = CLValue.newCLPublicKey(PublicKey.fromHex(parsedStr));
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
          argsMap[key] = CLValue.newCLByteArray(Uint8Array.from(parsed as number[]));
        } else {
          argsMap[key] = parsed;
        }
      }

      const hashType = contractCall.hash_type || 'package';
      builder = new ContractCallBuilder();

      // Call by package hash or contract hash
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

    } else if (transactionJson.session.stored_contract_by_name) {
      // Check if this is delegation
      const contractCall = transactionJson.session.stored_contract_by_name;

      if (contractCall.name === 'auction' && contractCall.entry_point === 'delegate') {
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
        throw new Error(`stored_contract_by_name for ${contractCall.name}/${contractCall.entry_point} not supported`);
      }

    } else if (transactionJson.session.module_bytes) {
      throw new Error("module_bytes session type not supported in browser (requires WASM bytes)");
    } else {
      throw new Error("Unknown transaction type");
    }

    return builder.build();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reconstruct transaction: ${message}`);
  }
}

/**
 * Convert MCP Transaction V1 format to Deploy format for wallet signing
 *
 * This is the key conversion function that bridges MCP server output
 * (Transaction V1) with frontend wallet requirements (Deploy format).
 *
 * @param unsignedTransaction - Transaction V1 JSON from MCP tool's unsigned_deploy field
 * @returns Deploy format ready for CSPR.click wallet signing
 *
 * @example
 * // From chat interface:
 * const mcpOutput = {
 *   type: "transfer",
 *   unsigned_deploy: { hash, header, payment, session, approvals }  // Transaction V1
 * };
 *
 * // Convert to Deploy format:
 * const deployFormat = convertToDeployFormat(mcpOutput.unsigned_deploy);
 *
 * // Sign with wallet:
 * const result = await signDeploy(deployFormat);
 */
export function convertToDeployFormat(unsignedTransaction: object): object {
  try {
    // Step 1: Reconstruct Transaction from simplified JSON
    const transaction = reconstructTransaction(unsignedTransaction as SdkTransactionJson);

    // Step 2: Extract Deploy format (Casper 1.5)
    // The SDK's Transaction object has a getDeploy() method that returns
    // the Deploy format needed for account_put_deploy RPC method
    const deploy = transaction.getDeploy();

    if (!deploy) {
      throw new Error("Failed to extract Deploy from Transaction - getDeploy() returned null");
    }

    // Step 3: Convert to JSON for wallet signing
    // The Deploy object has a toJSON() method that produces the format
    // expected by CSPR.click wallet and account_put_deploy
    if (typeof deploy.toJSON === 'function') {
      return deploy.toJSON();
    }

    // Fallback: return as-is if no toJSON method
    return deploy;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Transaction format conversion failed: ${message}`);
  }
}

/**
 * Check if an unsigned transaction needs format conversion
 *
 * Transaction V1 format has these characteristics:
 * - Has 'hash' field at top level
 * - Has 'header', 'payment', 'session' structure
 * - session uses lowercase keys (transfer, stored_contract_by_hash)
 *
 * Deploy format has these characteristics:
 * - Has 'hash' field at top level
 * - Uses PascalCase session variants (Transfer, StoredContractByHash)
 */
export function needsConversion(unsignedTransaction: any): boolean {
  // Check if it has Transaction V1 structure
  if (!unsignedTransaction || typeof unsignedTransaction !== 'object') {
    return false;
  }

  // If it has session with lowercase keys, it's Transaction V1
  if (unsignedTransaction.session) {
    const sessionKeys = Object.keys(unsignedTransaction.session);
    const hasLowercaseVariant = sessionKeys.some(key =>
      key === 'transfer' ||
      key === 'stored_contract_by_hash' ||
      key === 'stored_contract_by_name' ||
      key === 'module_bytes'
    );
    if (hasLowercaseVariant) {
      return true; // Transaction V1 format
    }
  }

  // If it has PascalCase session keys, it's already Deploy format
  return false;
}
