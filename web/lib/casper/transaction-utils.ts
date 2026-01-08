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
import {
  AUCTION_CONTRACT_HASH,
  MOTES_PER_CSPR,
  PAYMENT_TRANSFER_MOTES,
  PAYMENT_CONTRACT_CALL_MOTES,
  MIN_VALID_PAYMENT_MOTES,
} from "./constants";

const {
  PublicKey,
  ContractCallBuilder,
  NativeTransferBuilder,
  Args,
  Key,
  CLValue,
  Deploy,
} = casperSdk;

// Debug logging - only enabled in development
const DEBUG = process.env.NODE_ENV === 'development';
function debugLog(message: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.log(`[transaction-utils] ${message}`, ...args);
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/** CLValue argument tuple: [key, value] */
type CLValueArg = [string, { parsed: unknown; cl_type: string; bytes?: string }];

/** Transfer session data */
interface TransferSession {
  args: CLValueArg[];
}

/** Contract call session data */
interface StoredContractByHashSession {
  args: CLValueArg[];
  entry_point: string;
  hash: string;
  hash_type?: 'package' | 'contract';
}

/** Contract by name session data */
interface StoredContractByNameSession {
  args: CLValueArg[];
  entry_point: string;
  name: string;
}

/** Module bytes session data */
interface ModuleBytesSession {
  args: CLValueArg[];
  module_bytes: string;
}

/** Payment module bytes */
interface PaymentModuleBytes {
  args: CLValueArg[];
}

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
    module_bytes?: PaymentModuleBytes;
    ModuleBytes?: PaymentModuleBytes;
  };
  session: {
    transfer?: TransferSession;
    Transfer?: TransferSession;
    stored_contract_by_hash?: StoredContractByHashSession;
    StoredContractByHash?: StoredContractByHashSession;
    stored_contract_by_name?: StoredContractByNameSession;
    StoredContractByName?: StoredContractByNameSession;
    module_bytes?: ModuleBytesSession;
    ModuleBytes?: ModuleBytesSession;
  };
  approvals?: Array<{ signer: string; signature: string }>;
}

/** Simplified MCP format (used for some tools) */
interface SimplifiedMcpFormat {
  deploy_type?: string;
  contract_address?: string;
  entry_point?: string;
  caller?: string;
  from?: string;
  network?: string;
  gas_price?: number;
  ttl?: string;
  payment_amount?: string;
  hash_type?: 'package' | 'contract';
  args?: CLValueArg[];
}

// ============================================================================
// U512 Encoding/Decoding Utilities
// ============================================================================

/**
 * Decode a CLValue U512 from hex bytes
 * Format: length prefix byte + little-endian value bytes
 *
 * @param hexBytes - Hex string with optional 0x prefix
 * @returns Decoded BigInt value
 * @throws Error if hex string is invalid
 */
export function decodeU512Bytes(hexBytes: string): bigint {
  const hex = hexBytes.startsWith('0x') ? hexBytes.slice(2) : hexBytes;

  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error(`Invalid hex string: ${hexBytes}`);
  }

  if (hex.length < 2) {
    throw new Error(`Hex string too short: ${hexBytes}`);
  }

  const length = parseInt(hex.slice(0, 2), 16);

  // Handle zero value
  if (length === 0) {
    return 0n;
  }

  const valueHex = hex.slice(2, 2 + length * 2);

  if (valueHex.length !== length * 2) {
    throw new Error(`Invalid U512 encoding: expected ${length * 2} chars, got ${valueHex.length}`);
  }

  // Convert little-endian bytes to big-endian
  const bytes: string[] = [];
  for (let i = 0; i < valueHex.length; i += 2) {
    bytes.push(valueHex.slice(i, i + 2));
  }
  const bigEndianHex = bytes.reverse().join('');

  return BigInt('0x' + bigEndianHex);
}

/**
 * Encode a BigInt to CLValue U512 hex bytes
 * Format: length prefix byte + little-endian value bytes
 *
 * @param value - Non-negative BigInt value to encode
 * @returns Hex string without 0x prefix
 * @throws Error if value is negative
 */
export function encodeU512ToBytes(value: bigint): string {
  if (value < 0n) {
    throw new Error('U512 cannot be negative');
  }

  if (value === 0n) {
    return '00';
  }

  // Convert to hex and ensure even length
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }

  // Convert big-endian hex to little-endian bytes
  const bytes: string[] = [];
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    bytes.push(hex.slice(i, i + 2));
  }

  // Remove trailing zeros (leading zeros in big-endian) from little-endian representation
  while (bytes.length > 1 && bytes[bytes.length - 1] === '00') {
    bytes.pop();
  }

  // Length prefix + value bytes
  const lengthByte = bytes.length.toString(16).padStart(2, '0');
  return lengthByte + bytes.join('');
}

// ============================================================================
// Payment Parsing
// ============================================================================

/**
 * Parse payment amount from transaction JSON
 * Handles both decimal strings and CLValue hex bytes
 *
 * @param amountValue - Object with parsed and/or bytes fields
 * @returns Parsed amount in motes, or null if parsing fails
 */
function parsePaymentAmount(amountValue: { parsed?: unknown; bytes?: string }): number | null {
  debugLog('parsePaymentAmount input:', JSON.stringify(amountValue));

  // Try bytes field first (CLValue format)
  if (amountValue.bytes && typeof amountValue.bytes === 'string') {
    try {
      const amount = Number(decodeU512Bytes(amountValue.bytes));
      if (amount >= MIN_VALID_PAYMENT_MOTES) {
        debugLog(`Decoded bytes to ${amount} motes (${amount / MOTES_PER_CSPR} CSPR)`);
        return amount;
      }
    } catch {
      // Fall through to parsed field
    }
  }

  // Try parsed field
  if (amountValue.parsed !== undefined) {
    const parsed = String(amountValue.parsed);

    // Check if it looks like hex bytes (contains hex letters a-f)
    if (/^[0-9a-fA-F]+$/.test(parsed) && /[a-fA-F]/.test(parsed)) {
      try {
        const amount = Number(decodeU512Bytes(parsed));
        if (amount >= MIN_VALID_PAYMENT_MOTES) {
          debugLog(`Decoded hex to ${amount} motes (${amount / MOTES_PER_CSPR} CSPR)`);
          return amount;
        }
      } catch {
        // Fall through to decimal parse
      }
    }

    // Check if purely numeric (decimal string)
    if (/^\d+$/.test(parsed)) {
      const decimal = parseInt(parsed, 10);
      if (!isNaN(decimal) && decimal >= MIN_VALID_PAYMENT_MOTES) {
        debugLog(`Parsed decimal to ${decimal} motes (${decimal / MOTES_PER_CSPR} CSPR)`);
        return decimal;
      }
    }
  }

  debugLog('Failed to parse payment amount, returning null');
  return null;
}

// ============================================================================
// TTL Parsing
// ============================================================================

/**
 * Parse TTL string to milliseconds
 * Supports: "30m", "1h", "60s", "1800000ms", or raw number
 *
 * @param ttl - TTL string in various formats
 * @returns TTL in milliseconds
 * @throws Error if format is invalid
 */
export function parseTtlToMilliseconds(ttl: string): number {
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

// ============================================================================
// CLValue Conversion
// ============================================================================

/**
 * Convert a parsed CLValue argument to SDK CLValue
 *
 * @param clType - The CL type string (e.g., "Key", "U256", "String")
 * @param parsed - The parsed value
 * @returns SDK CLValue object
 */
function convertToCLValue(clType: string, parsed: unknown): unknown {
  switch (clType) {
    case "Key": {
      const parsedStr = parsed as string;
      if (parsedStr.startsWith('hash-') || parsedStr.startsWith('account-hash-')) {
        const keyObj = Key.newKey(parsedStr);
        return CLValue.newCLKey(keyObj);
      } else {
        // Public key - convert to account-hash format
        const publicKey = PublicKey.fromHex(parsedStr);
        const accountHash = publicKey.accountHash();
        const keyStr = accountHash.toPrefixedString();
        const keyObj = Key.newKey(keyStr);
        return CLValue.newCLKey(keyObj);
      }
    }
    case "U256":
      return CLValue.newCLUInt256(BigInt(parsed as string));
    case "U512":
      return CLValue.newCLUInt512(BigInt(parsed as string));
    case "U128":
      return CLValue.newCLUInt128(BigInt(parsed as string));
    case "U64":
      return CLValue.newCLUint64(Number(parsed));
    case "U32":
      return CLValue.newCLUInt32(Number(parsed));
    case "U8":
      return CLValue.newCLUint8(Number(parsed));
    case "Bool":
      return CLValue.newCLValueBool(Boolean(parsed));
    case "String":
      return CLValue.newCLString(parsed as string);
    case "ByteArray":
      return CLValue.newCLByteArray(Uint8Array.from(parsed as number[]));
    case "PublicKey": {
      const publicKey = PublicKey.fromHex(parsed as string);
      return CLValue.newCLPublicKey(publicKey);
    }
    default:
      // Return as-is for unknown types
      return parsed;
  }
}

// ============================================================================
// Transaction Reconstruction
// ============================================================================

/**
 * Reconstruct Transaction object from MCP tool output
 *
 * Converts simplified JSON structure to proper SDK Transaction object
 * using builder pattern (same as backend signing utilities).
 *
 * @param transactionJson - MCP tool output in standard format
 * @returns SDK Deploy object ready for serialization
 */
function reconstructTransaction(transactionJson: SdkTransactionJson): unknown {
  const senderKey = PublicKey.fromHex(transactionJson.header.account);
  const chainName = transactionJson.header.chain_name;

  // Parse payment amount - check both lowercase and PascalCase
  let parsedPayment: number | null = null;
  const paymentArgs = transactionJson.payment?.module_bytes?.args ||
                      transactionJson.payment?.ModuleBytes?.args;

  if (paymentArgs) {
    const amountArg = paymentArgs.find(([key]) => key === 'amount');
    if (amountArg && amountArg[1]) {
      parsedPayment = parsePaymentAmount(amountArg[1]);
    }
  }

  // Check both lowercase and PascalCase session variants
  const transfer = transactionJson.session.transfer || transactionJson.session.Transfer;
  const storedContractByHash = transactionJson.session.stored_contract_by_hash ||
                                transactionJson.session.StoredContractByHash;
  const storedContractByName = transactionJson.session.stored_contract_by_name ||
                                transactionJson.session.StoredContractByName;
  const moduleBytes = transactionJson.session.module_bytes ||
                      transactionJson.session.ModuleBytes;

  // Determine appropriate payment based on transaction type
  const isContractCall = storedContractByHash || storedContractByName;
  const minimumPayment = isContractCall ? PAYMENT_CONTRACT_CALL_MOTES : PAYMENT_TRANSFER_MOTES;

  // Use parsed payment if valid AND sufficient, otherwise use minimum
  const paymentAmount = (parsedPayment !== null && parsedPayment >= minimumPayment)
    ? parsedPayment
    : minimumPayment;

  debugLog(`Payment: parsed=${parsedPayment}, minimum=${minimumPayment}, using=${paymentAmount}`);

  let builder;

  // Determine transaction type and create appropriate builder
  if (transfer) {
    // Native CSPR transfer
    const transferArgs = transfer.args;
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

  } else if (storedContractByHash) {
    // Contract call
    const contractCall = storedContractByHash;
    const isAuctionContract = contractCall.hash.toLowerCase() === AUCTION_CONTRACT_HASH.toLowerCase();

    debugLog(`Contract call: hash=${contractCall.hash}, entry_point=${contractCall.entry_point}, isAuction=${isAuctionContract}`);

    // Build contract call args
    const argsMap: Record<string, unknown> = {};
    for (const [key, value] of contractCall.args) {
      argsMap[key] = convertToCLValue(value.cl_type, value.parsed);
    }

    // Determine which method to use based on contract type:
    // - System contracts (auction): Use byHash() -> StoredContractByHash
    // - User contracts (CEP-18, NFT, DAO, DEX): Use byPackageHash() -> StoredVersionedContractByHash
    builder = new ContractCallBuilder();

    if (isAuctionContract) {
      debugLog('Using byHash() for system auction contract');
      builder = builder.byHash(contractCall.hash);
    } else {
      debugLog('Using byPackageHash() for user contract');
      builder = builder.byPackageHash(contractCall.hash, undefined);
    }

    builder = builder
      .from(senderKey)
      .entryPoint(contractCall.entry_point)
      .chainName(chainName)
      .runtimeArgs(Args.fromMap(argsMap as Record<string, never>))
      .ttl(parseTtlToMilliseconds(transactionJson.header.ttl))
      .payment(paymentAmount);

  } else if (storedContractByName) {
    // stored_contract_by_name is not used by MCP server
    throw new Error(`stored_contract_by_name for ${storedContractByName.name}/${storedContractByName.entry_point} is not supported. Use stored_contract_by_hash instead.`);

  } else if (moduleBytes) {
    throw new Error("module_bytes session type requires WASM bytes and is not supported in browser signing");

  } else {
    throw new Error("Unknown transaction type - must be transfer or stored_contract_by_hash");
  }

  // Build for Casper 1.5 (Deploy format) which testnet uses
  return builder.buildFor1_5();
}

// ============================================================================
// Simplified Format Conversion
// ============================================================================

/**
 * Convert simplified MCP format to standard transaction JSON format
 * Handles formats that don't have the standard header/payment/session structure
 *
 * @param tx - Simplified MCP format object
 * @returns Standard transaction JSON or null if not a simplified format
 */
function convertSimplifiedFormat(tx: SimplifiedMcpFormat): SdkTransactionJson | null {
  // Check if this is a simplified format
  if (!tx.deploy_type && !tx.contract_address && !tx.entry_point) {
    return null;
  }

  debugLog('Converting simplified MCP format to standard format');

  // Get the caller/from address
  const caller = tx.caller || tx.from;
  if (!caller) {
    throw new Error('Simplified format requires caller or from field');
  }

  // Determine network
  const chainName = tx.network === 'mainnet' ? 'casper' : 'casper-test';

  // Build standard format
  const standardFormat: SdkTransactionJson = {
    header: {
      account: caller,
      chain_name: chainName,
      gas_price: tx.gas_price || 1,
      ttl: tx.ttl || '30m',
    },
    payment: {
      module_bytes: {
        args: [
          ['amount', { parsed: tx.payment_amount || '3000000000', cl_type: 'U512' }]
        ]
      }
    },
    session: {}
  };

  // Add session based on type
  if (tx.contract_address) {
    const contractHash = tx.contract_address.replace('hash-', '').replace('contract-package-', '');
    standardFormat.session.stored_contract_by_hash = {
      hash: contractHash,
      entry_point: tx.entry_point || 'unknown',
      hash_type: tx.hash_type || 'package',
      args: tx.args || []
    };
  } else if (tx.deploy_type === 'transfer') {
    standardFormat.session.transfer = {
      args: tx.args || []
    };
  }

  return standardFormat;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Convert MCP Transaction V1 format to Deploy format for wallet signing
 *
 * This is the key conversion function that bridges MCP server output
 * (Transaction V1 JSON) with frontend wallet requirements (Deploy format).
 *
 * @param unsignedTransaction - Transaction V1 JSON from MCP tool's unsigned_deploy field
 * @returns Deploy format ready for CSPR.click wallet signing
 * @throws Error if conversion fails
 */
export function convertToDeployFormat(unsignedTransaction: object): object {
  debugLog('Input length:', JSON.stringify(unsignedTransaction).length);

  // Check if this is already in Deploy format (PascalCase session keys)
  const tx = unsignedTransaction as Record<string, unknown>;
  if (tx.session && typeof tx.session === 'object') {
    const sessionKeys = Object.keys(tx.session as object);
    const hasPascalCaseVariant = sessionKeys.some(key =>
      key === 'Transfer' ||
      key === 'StoredContractByHash' ||
      key === 'StoredContractByName' ||
      key === 'ModuleBytes'
    );

    // If it's already in Deploy format and has proper structure, return as-is
    if (hasPascalCaseVariant && tx.hash && (tx.header as Record<string, unknown>)?.body_hash) {
      debugLog('Deploy already in correct format, passing through');
      return unsignedTransaction;
    }
  }

  // Check if this is a simplified format (no header/session structure)
  let transactionToProcess = unsignedTransaction as SdkTransactionJson;
  if (!tx.header || !tx.session) {
    const converted = convertSimplifiedFormat(tx as SimplifiedMcpFormat);
    if (converted) {
      transactionToProcess = converted;
    }
  }

  // Step 1: Reconstruct Transaction from simplified JSON using SDK builders
  debugLog('Reconstructing transaction from MCP JSON...');
  const transaction = reconstructTransaction(transactionToProcess);

  if (!transaction) {
    throw new Error("Failed to reconstruct transaction - builder returned null");
  }

  // Step 2: Convert to JSON for wallet signing
  let deployJson: Record<string, unknown>;

  const asDeploy = transaction as { header?: unknown; payment?: unknown; session?: unknown; toJSON?: () => object };
  if (asDeploy.header && asDeploy.payment && asDeploy.session) {
    deployJson = Deploy.toJSON(transaction) as Record<string, unknown>;
  } else if (typeof asDeploy.toJSON === 'function') {
    deployJson = asDeploy.toJSON() as Record<string, unknown>;
  } else {
    throw new Error("Unable to serialize transaction: no toJSON method available");
  }

  // Step 3: Fix payment amount in serialized JSON
  // The SDK's ContractCallBuilder.payment() doesn't always set payment correctly
  const isContractCall = transactionToProcess.session?.stored_contract_by_hash ||
                         transactionToProcess.session?.StoredContractByHash ||
                         transactionToProcess.session?.stored_contract_by_name ||
                         transactionToProcess.session?.StoredContractByName;

  const minimumPayment = isContractCall ? PAYMENT_CONTRACT_CALL_MOTES : PAYMENT_TRANSFER_MOTES;

  // Parse desired payment from original input
  let desiredPayment: number | null = null;
  const originalPayment = transactionToProcess.payment?.module_bytes?.args ||
                          transactionToProcess.payment?.ModuleBytes?.args;
  if (originalPayment) {
    const originalAmountArg = originalPayment.find(([key]) => key === 'amount');
    if (originalAmountArg && originalAmountArg[1]) {
      desiredPayment = parsePaymentAmount(originalAmountArg[1]);
    }
  }

  const finalPayment = Math.max(desiredPayment || minimumPayment, minimumPayment);
  debugLog(`Payment fix: desired=${desiredPayment}, minimum=${minimumPayment}, final=${finalPayment}`);

  // Override payment in the deploy JSON
  const payment = deployJson.payment as Record<string, unknown> | undefined;
  const moduleBytes = payment?.ModuleBytes as { args?: Array<[string, unknown]> } | undefined;

  if (moduleBytes?.args) {
    const amountArgIndex = moduleBytes.args.findIndex(([key]) => key === 'amount');
    if (amountArgIndex >= 0) {
      const paymentBytes = encodeU512ToBytes(BigInt(finalPayment));
      moduleBytes.args[amountArgIndex][1] = {
        cl_type: 'U512',
        bytes: paymentBytes
      };
      debugLog(`Payment overridden to ${finalPayment} motes (bytes: ${paymentBytes})`);
    } else {
      // Amount arg not found - add it
      debugLog('Amount arg not found in payment, adding it');
      const paymentBytes = encodeU512ToBytes(BigInt(finalPayment));
      moduleBytes.args.push(['amount', { cl_type: 'U512', bytes: paymentBytes }]);
    }
  }

  debugLog('Transaction converted to Deploy format');
  return deployJson as object;
}

/**
 * Check if an unsigned transaction needs format conversion
 *
 * Transaction V1 format (MCP output) has these characteristics:
 * - Has 'header', 'payment', 'session' structure
 * - session uses lowercase keys (transfer, stored_contract_by_hash)
 *
 * Simplified MCP format has these characteristics:
 * - Has 'deploy_type', 'contract_address', or 'entry_point' at root
 * - No 'header' or 'session' structure
 *
 * Deploy format has these characteristics:
 * - Has 'hash' field at top level with computed hash
 * - Has 'header.body_hash' computed
 * - Uses PascalCase session variants (Transfer, StoredContractByHash)
 *
 * @param unsignedTransaction - Transaction object to check
 * @returns true if conversion is needed
 */
export function needsConversion(unsignedTransaction: unknown): boolean {
  if (!unsignedTransaction || typeof unsignedTransaction !== 'object') {
    return false;
  }

  const tx = unsignedTransaction as Record<string, unknown>;

  // Simplified format always needs conversion
  if (tx.deploy_type ||
      (tx.contract_address && !tx.session) ||
      (tx.entry_point && !tx.session)) {
    return true;
  }

  // If it has session with lowercase keys, it needs conversion
  if (tx.session && typeof tx.session === 'object') {
    const sessionKeys = Object.keys(tx.session as object);
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
  const header = tx.header as Record<string, unknown> | undefined;
  if (!tx.hash || !header?.body_hash) {
    return true;
  }

  return false;
}
