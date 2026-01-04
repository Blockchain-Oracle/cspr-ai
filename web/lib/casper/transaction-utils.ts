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
  makeAuctionManagerDeploy,
  AuctionManagerEntryPoint,
  CasperNetworkName,
} = casperSdk;

// Auction contract hash (for delegation transactions)
// This is the system auction contract on both testnet and mainnet
const AUCTION_CONTRACT_HASH = "93d923e336b20a4c4ca14d592b60e5bd3fe330775618290104f9beb326db7ae2";

// Payment amounts in motes (1 CSPR = 1,000,000,000 motes)
const DELEGATION_PAYMENT_MOTES = 2_500_000_000; // 2.5 CSPR for delegation

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
 * Encode a BigInt to CLValue U512 hex bytes
 * Format: length prefix byte + little-endian value bytes
 */
function encodeU512ToBytes(value: bigint): string {
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

// Payment constants in motes (1 CSPR = 1,000,000,000 motes)
const CSPR_TO_MOTES = 1_000_000_000;
const PAYMENT_TRANSFER = 0.1 * CSPR_TO_MOTES;      // 0.1 CSPR for native transfers
const PAYMENT_CONTRACT_CALL = 3 * CSPR_TO_MOTES;  // 3 CSPR for contract calls (covers most operations)

/**
 * Parse payment amount from transaction JSON
 * Handles both decimal strings and CLValue hex bytes
 * Returns the parsed amount or null if parsing fails
 */
function parsePaymentAmount(amountValue: { parsed?: unknown; bytes?: string }): number | null {
  console.log(`[parsePaymentAmount] Input:`, JSON.stringify(amountValue));

  // Try bytes field first (CLValue format)
  if (amountValue.bytes && typeof amountValue.bytes === 'string') {
    console.log(`[parsePaymentAmount] Trying bytes field: "${amountValue.bytes}"`);
    try {
      const amount = Number(decodeU512Bytes(amountValue.bytes));
      console.log(`[parsePaymentAmount] Decoded bytes to ${amount} motes (${amount / 1_000_000_000} CSPR)`);
      // Only return if it's a reasonable amount (at least 0.01 CSPR)
      if (amount >= 10_000_000) {
        return amount;
      }
      console.log(`[parsePaymentAmount] Amount ${amount} is below minimum 10_000_000`);
    } catch (e) {
      console.log(`[parsePaymentAmount] Failed to decode bytes: ${e}`);
      // Fall through to parsed
    }
  }

  // Try parsed field
  if (amountValue.parsed !== undefined) {
    const parsed = String(amountValue.parsed);
    console.log(`[parsePaymentAmount] Trying parsed field: "${parsed}"`);

    // Check if it looks like hex bytes (contains hex letters a-f)
    // MCP server outputs payment as hex like "0500e1f505" which represents CLValue bytes
    if (/^[0-9a-fA-F]+$/.test(parsed) && /[a-fA-F]/.test(parsed)) {
      // This contains hex letters, so it's definitely hex-encoded bytes
      console.log(`[parsePaymentAmount] Parsed looks like hex bytes, decoding...`);
      try {
        const amount = Number(decodeU512Bytes(parsed));
        console.log(`[parsePaymentAmount] Decoded hex "${parsed}" to ${amount} motes (${amount / 1_000_000_000} CSPR)`);
        // Only return if it's a reasonable amount (at least 0.01 CSPR)
        if (amount >= 10_000_000) {
          return amount;
        }
      } catch (e) {
        console.log(`[parsePaymentAmount] Failed to decode hex: ${e}`);
        // Fall through to decimal parse
      }
    }

    // Check if purely numeric (decimal string)
    if (/^\d+$/.test(parsed)) {
      const decimal = parseInt(parsed, 10);
      console.log(`[parsePaymentAmount] Parsed decimal "${parsed}" to ${decimal} motes (${decimal / 1_000_000_000} CSPR)`);
      // Only return if it's a reasonable amount (at least 0.01 CSPR)
      if (!isNaN(decimal) && decimal >= 10_000_000) {
        return decimal;
      }
      console.log(`[parsePaymentAmount] Decimal ${decimal} failed validation`);
    } else {
      console.log(`[parsePaymentAmount] Parsed "${parsed}" does not match decimal pattern`);
    }
  }

  // Return null to indicate parsing failed - caller should use appropriate default
  console.log(`[parsePaymentAmount] Failed to parse, returning null`);
  return null;
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
    let parsedPayment: number | null = null;
    const paymentArgs = transactionJson.payment?.module_bytes?.args ||
                        transactionJson.payment?.ModuleBytes?.args;
    console.log('[reconstructTransaction] Full payment object:', JSON.stringify(transactionJson.payment));
    console.log('[reconstructTransaction] Raw payment args:', JSON.stringify(paymentArgs));
    if (paymentArgs) {
      const amountArg = paymentArgs.find(
        ([key]: [string, any]) => key === 'amount'
      );
      console.log('[reconstructTransaction] Amount arg:', JSON.stringify(amountArg));
      if (amountArg && amountArg[1]) {
        parsedPayment = parsePaymentAmount(amountArg[1] as { parsed?: unknown; bytes?: string });
        console.log('[reconstructTransaction] Parsed payment result:', parsedPayment);
      }
    }

    // CRITICAL: Always use at least 3 CSPR for contract calls regardless of input
    // This ensures we don't accidentally use transfer payment (0.1 CSPR) for contract calls

    let builder;

    // Check both lowercase and PascalCase session variants
    const transfer = transactionJson.session.transfer || transactionJson.session.Transfer;
    const storedContractByHash = transactionJson.session.stored_contract_by_hash ||
                                  transactionJson.session.StoredContractByHash;
    const storedContractByName = transactionJson.session.stored_contract_by_name ||
                                  transactionJson.session.StoredContractByName;
    const moduleBytes = transactionJson.session.module_bytes ||
                        transactionJson.session.ModuleBytes;

    // Determine appropriate payment based on transaction type
    // CRITICAL: Contract calls need at least 3 CSPR, transfers use 0.1 CSPR
    const isContractCall = storedContractByHash || storedContractByName;
    const minimumPayment = isContractCall ? PAYMENT_CONTRACT_CALL : PAYMENT_TRANSFER;

    // Use parsed payment if valid AND sufficient for the transaction type
    // Otherwise use the minimum required payment
    let paymentAmount: number;
    if (parsedPayment !== null && parsedPayment >= minimumPayment) {
      paymentAmount = parsedPayment;
    } else {
      paymentAmount = minimumPayment;
    }
    console.log(`[reconstructTransaction] Payment: parsed=${parsedPayment}, minimum=${minimumPayment}, isContractCall=${isContractCall}, using=${paymentAmount}`);

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

      // Check if this is a delegation to the auction contract - use SDK's dedicated function
      const isAuctionContract = contractCall.hash.toLowerCase() === AUCTION_CONTRACT_HASH.toLowerCase();
      const isDelegateEntryPoint = contractCall.entry_point === 'delegate';

      if (isAuctionContract && isDelegateEntryPoint) {
        // Use makeAuctionManagerDeploy for delegation - this is the SDK's official way
        const delegatorArg = contractCall.args.find(([key]: [string, any]) => key === 'delegator');
        const validatorArg = contractCall.args.find(([key]: [string, any]) => key === 'validator');
        const amountArg = contractCall.args.find(([key]: [string, any]) => key === 'amount');

        if (!delegatorArg || !validatorArg || !amountArg) {
          throw new Error('Delegation requires delegator, validator, and amount arguments');
        }

        const delegatorHex = delegatorArg[1].parsed as string;
        const validatorHex = validatorArg[1].parsed as string;
        const amountMotes = amountArg[1].parsed as string;

        console.log('[transaction-utils] Building delegation with makeAuctionManagerDeploy');
        console.log('[transaction-utils] Delegator:', delegatorHex);
        console.log('[transaction-utils] Validator:', validatorHex);
        console.log('[transaction-utils] Amount:', amountMotes, 'motes');
        console.log('[transaction-utils] Payment:', DELEGATION_PAYMENT_MOTES, 'motes (2.5 CSPR)');

        // Use SDK's makeAuctionManagerDeploy - creates proper Deploy object
        const networkName = chainName as typeof CasperNetworkName.Testnet;
        const deploy = makeAuctionManagerDeploy({
          delegatorPublicKeyHex: delegatorHex,
          validatorPublicKeyHex: validatorHex,
          contractEntryPoint: AuctionManagerEntryPoint.delegate,
          amount: amountMotes,
          paymentAmount: String(DELEGATION_PAYMENT_MOTES),
          chainName: networkName,
          ttl: parseTtlToMilliseconds(transactionJson.header.ttl),
          contractHash: AUCTION_CONTRACT_HASH,
          gasPrice: transactionJson.header.gas_price || 1
        });

        return deploy;
      }

      // Regular contract call (not delegation)
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

      // CRITICAL: Always use byPackageHash() for Casper 1.5 network
      // byPackageHash() produces StoredVersionedContractByHash which is required
      // byHash() produces StoredContractByHash which causes "Invalid Deploy" errors
      console.log(`[reconstructTransaction] Building contract call with payment: ${paymentAmount} motes (${paymentAmount / 1_000_000_000} CSPR)`);
      console.log(`[reconstructTransaction] Contract hash: ${contractCall.hash}`);
      console.log(`[reconstructTransaction] Entry point: ${contractCall.entry_point}`);

      builder = new ContractCallBuilder();
      builder = builder.byPackageHash(contractCall.hash, null as unknown as number | undefined);

      builder = builder
        .from(senderKey)
        .entryPoint(contractCall.entry_point)
        .chainName(chainName)
        .runtimeArgs(Args.fromMap(argsMap as Record<string, never>))
        .ttl(parseTtlToMilliseconds(transactionJson.header.ttl))
        .payment(paymentAmount);

      console.log('[reconstructTransaction] ContractCallBuilder configured with payment');

    } else if (storedContractByName) {
      // Handle stored_contract_by_name - mainly used for delegation to auction contract
      const contractCall = storedContractByName as any;
      const isAuctionContract = contractCall.name === 'auction';
      const isDelegateEntryPoint = contractCall.entry_point === 'delegate';

      if (isAuctionContract && isDelegateEntryPoint) {
        // Use makeAuctionManagerDeploy for delegation - this is the SDK's official way
        const delegatorArg = contractCall.args.find(([key]: [string, any]) => key === 'delegator');
        const validatorArg = contractCall.args.find(([key]: [string, any]) => key === 'validator');
        const amountArg = contractCall.args.find(([key]: [string, any]) => key === 'amount');

        if (!delegatorArg || !validatorArg || !amountArg) {
          throw new Error('Delegation requires delegator, validator, and amount arguments');
        }

        const delegatorHex = delegatorArg[1].parsed as string;
        const validatorHex = validatorArg[1].parsed as string;
        const amountMotes = amountArg[1].parsed as string;

        console.log('[transaction-utils] Building delegation (by name) with makeAuctionManagerDeploy');
        console.log('[transaction-utils] Delegator:', delegatorHex);
        console.log('[transaction-utils] Validator:', validatorHex);
        console.log('[transaction-utils] Amount:', amountMotes, 'motes');
        console.log('[transaction-utils] Payment:', DELEGATION_PAYMENT_MOTES, 'motes (2.5 CSPR)');

        // Use SDK's makeAuctionManagerDeploy - creates proper Deploy object
        const networkName = chainName as typeof CasperNetworkName.Testnet;
        const deploy = makeAuctionManagerDeploy({
          delegatorPublicKeyHex: delegatorHex,
          validatorPublicKeyHex: validatorHex,
          contractEntryPoint: AuctionManagerEntryPoint.delegate,
          amount: amountMotes,
          paymentAmount: String(DELEGATION_PAYMENT_MOTES),
          chainName: networkName,
          ttl: parseTtlToMilliseconds(transactionJson.header.ttl),
          contractHash: AUCTION_CONTRACT_HASH,
          gasPrice: transactionJson.header.gas_price || 1
        });

        return deploy;
      }

      // Other stored_contract_by_name calls - not yet supported
      throw new Error(`stored_contract_by_name for ${contractCall.name}/${contractCall.entry_point} is not supported. Use stored_contract_by_hash instead.`);

    } else if (moduleBytes) {
      throw new Error("module_bytes session type requires WASM bytes and is not supported in browser signing");
    } else {
      throw new Error("Unknown transaction type - must be transfer or stored_contract_by_hash");
    }

    // Build for Casper 1.5 (Deploy format) which testnet uses
    const builtDeploy = builder.buildFor1_5();
    console.log('[reconstructTransaction] Built deploy, serializing to check payment...');

    // Log the payment from the built deploy to verify it's correct
    try {
      // The built deploy should have a toJSON method or we use Deploy.toJSON
      const deployAsAny = builtDeploy as any;
      let deployJson: any;
      if (deployAsAny.header && deployAsAny.payment && deployAsAny.session) {
        // It's a Deploy object - use static toJSON
        deployJson = Deploy.toJSON(deployAsAny);
      } else if (typeof deployAsAny.toJSON === 'function') {
        deployJson = deployAsAny.toJSON();
      }
      if (deployJson) {
        const deployPayment = deployJson?.payment;
        console.log('[reconstructTransaction] Built deploy payment:', JSON.stringify(deployPayment));
      }
    } catch (e) {
      console.log('[reconstructTransaction] Could not log built deploy payment:', e);
    }

    return builtDeploy;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reconstruct transaction: ${message}`);
  }
}

/**
 * Convert simplified MCP format to standard transaction JSON format
 * Handles formats that don't have the standard header/payment/session structure
 */
function convertSimplifiedFormat(tx: any): SdkTransactionJson | null {
  // Check if this is a simplified format (has deploy_type or contract_address but no session)
  if (!tx.deploy_type && !tx.contract_address && !tx.entry_point) {
    return null;
  }

  // This is a simplified format - convert to standard format
  console.log('[transaction-utils] Converting simplified MCP format to standard format');

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
    const contractHash = tx.contract_address.replace('hash-', '');
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
    // Log full input for debugging
    const inputStr = JSON.stringify(unsignedTransaction);
    console.log('[convertToDeployFormat] Full input length:', inputStr.length);
    console.log('[convertToDeployFormat] Input (first 1000 chars):', inputStr.substring(0, 1000));
    console.log('[convertToDeployFormat] Input payment field:', JSON.stringify((unsignedTransaction as any)?.payment));

    // Check if this is already in Deploy format (PascalCase session keys)
    const tx = unsignedTransaction as any;
    if (tx.session) {
      const sessionKeys = Object.keys(tx.session);
      console.log('[convertToDeployFormat] Session keys:', sessionKeys);
      const hasPascalCaseVariant = sessionKeys.some(key =>
        key === 'Transfer' ||
        key === 'StoredContractByHash' ||
        key === 'StoredContractByName' ||
        key === 'ModuleBytes'
      );

      // If it's already in Deploy format and has proper structure, return as-is
      if (hasPascalCaseVariant && tx.hash && tx.header?.body_hash) {
        console.log('[transaction-utils] Deploy already in correct format, passing through');
        console.log('[transaction-utils] WARNING: Passing through may lose payment amount!');
        return unsignedTransaction;
      }
    }

    // Check if this is a simplified format (no header/session structure)
    let transactionToProcess = unsignedTransaction as SdkTransactionJson;
    if (!tx.header || !tx.session) {
      const converted = convertSimplifiedFormat(tx);
      if (converted) {
        transactionToProcess = converted;
      }
    }

    // Step 1: Reconstruct Transaction from simplified JSON using SDK builders
    console.log('[transaction-utils] Reconstructing transaction from MCP JSON...');
    const transaction = reconstructTransaction(transactionToProcess);

    if (!transaction) {
      throw new Error("Failed to reconstruct transaction - builder returned null");
    }

    // Step 2: Convert to JSON for wallet signing
    // The Deploy object has a toJSON() method or we can use Deploy.toJSON(deploy)
    let deployJson: any;

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

    // CRITICAL FIX: The SDK's ContractCallBuilder.payment() doesn't properly set payment
    // We need to manually override the payment amount in the serialized JSON
    // This ensures contract calls use 3 CSPR instead of the SDK's default 0.1 CSPR
    console.log('[transaction-utils] Raw SDK output payment:', JSON.stringify(deployJson?.payment));

    // Parse what payment we wanted from the original input
    let desiredPayment: number | null = null;
    const originalPayment = transactionToProcess.payment?.module_bytes?.args ||
                            transactionToProcess.payment?.ModuleBytes?.args;
    if (originalPayment) {
      const originalAmountArg = originalPayment.find(([key]: [string, any]) => key === 'amount');
      if (originalAmountArg && originalAmountArg[1]) {
        desiredPayment = parsePaymentAmount(originalAmountArg[1] as { parsed?: unknown; bytes?: string });
      }
    }

    // Determine transaction type for minimum payment
    const isContractCall = transactionToProcess.session?.stored_contract_by_hash ||
                           transactionToProcess.session?.StoredContractByHash ||
                           transactionToProcess.session?.stored_contract_by_name ||
                           transactionToProcess.session?.StoredContractByName;

    const minimumPayment = isContractCall ? PAYMENT_CONTRACT_CALL : PAYMENT_TRANSFER;
    const finalPayment = Math.max(desiredPayment || minimumPayment, minimumPayment);

    console.log(`[transaction-utils] Payment fix: desired=${desiredPayment}, minimum=${minimumPayment}, final=${finalPayment} (${finalPayment / 1_000_000_000} CSPR)`);

    // Override payment in the deploy JSON
    // SDK outputs payment as ModuleBytes.args with CLValue bytes
    if (deployJson?.payment?.ModuleBytes?.args) {
      const amountArgIndex = deployJson.payment.ModuleBytes.args.findIndex(
        ([key]: [string, any]) => key === 'amount'
      );
      if (amountArgIndex >= 0) {
        // Create properly encoded U512 CLValue bytes for the payment amount
        const paymentBytes = encodeU512ToBytes(BigInt(finalPayment));
        deployJson.payment.ModuleBytes.args[amountArgIndex][1] = {
          cl_type: 'U512',
          bytes: paymentBytes
        };
        console.log(`[transaction-utils] Payment overridden to ${finalPayment} motes (bytes: ${paymentBytes})`);
      }
    }

    console.log('[transaction-utils] Final payment:', JSON.stringify(deployJson?.payment));
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
 * Simplified MCP format has these characteristics:
 * - Has 'deploy_type', 'contract_address', or 'entry_point' at root
 * - No 'header' or 'session' structure
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

  // Simplified format always needs conversion
  if (unsignedTransaction.deploy_type ||
      (unsignedTransaction.contract_address && !unsignedTransaction.session) ||
      (unsignedTransaction.entry_point && !unsignedTransaction.session)) {
    return true;
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
