/**
 * Enum Serialization Utilities
 *
 * Helpers for serializing Rust enums to Casper-compatible byte arrays.
 *
 * ProposalAction enum from dao.rs:
 * ```rust
 * pub enum ProposalAction {
 *     MintTokens { recipient: Address, amount: U256 },        // Variant 0
 *     TreasuryTransfer { recipient: Address, amount: U256 },  // Variant 1
 *     UpdateVotingPeriod { new_period: u64 },                 // Variant 2
 *     Custom { description: String },                          // Variant 3
 * }
 * ```
 *
 * Serialization format:
 * - Byte 0: Variant index (0-3)
 * - Bytes 1+: Serialized field data
 */

/**
 * Serialize a String to Casper bytes format
 * Format: 4-byte length (little-endian) + UTF-8 bytes
 */
function serializeString(value: string): Buffer {
  const utf8Bytes = Buffer.from(value, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32LE(utf8Bytes.length);
  return Buffer.concat([length, utf8Bytes]);
}

/**
 * Serialize a U256 to Casper bytes format
 * Format: 1-byte length + little-endian bytes
 */
function serializeU256(value: string): Buffer {
  // Convert decimal string to BigInt
  const bigIntValue = BigInt(value);

  // Convert to little-endian bytes
  let hex = bigIntValue.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;

  const bytes: number[] = [];
  for (let i = hex.length; i > 0; i -= 2) {
    bytes.push(parseInt(hex.substring(i - 2, i), 16));
  }

  // Add length prefix
  const length = bytes.length;
  return Buffer.from([length, ...bytes]);
}

/**
 * Serialize an Address (public key) to Casper bytes format
 * Format: 1-byte account hash tag (0x01) + 32-byte hash
 */
function serializeAddress(publicKey: string): Buffer {
  // Remove any prefix (01, 02, etc.)
  let cleanKey = publicKey;
  if (cleanKey.startsWith('01') || cleanKey.startsWith('02')) {
    cleanKey = cleanKey.substring(2);
  }
  if (cleanKey.startsWith('hash-')) {
    cleanKey = cleanKey.substring(5);
  }

  // Convert hex string to bytes
  const keyBytes = Buffer.from(cleanKey, 'hex');

  // Account hash tag (0x01) + hash bytes
  return Buffer.concat([Buffer.from([0x01]), keyBytes]);
}

/**
 * Parameters for MintTokens variant
 */
export interface MintTokensParams {
  recipient: string;  // Public key or address
  amount: string;     // U256 as decimal string
}

/**
 * Parameters for TreasuryTransfer variant
 */
export interface TreasuryTransferParams {
  recipient: string;  // Public key or address
  amount: string;     // U256 as decimal string
}

/**
 * Parameters for UpdateVotingPeriod variant
 */
export interface UpdateVotingPeriodParams {
  new_period: string;  // u64 as decimal string
}

/**
 * Parameters for Custom variant
 */
export interface CustomParams {
  description: string;
}

/**
 * Union type for all ProposalAction parameters
 */
export type ProposalActionParams =
  | { type: 'mint_tokens'; params: MintTokensParams }
  | { type: 'treasury_transfer'; params: TreasuryTransferParams }
  | { type: 'update_voting_period'; params: UpdateVotingPeriodParams }
  | { type: 'custom'; params: CustomParams };

/**
 * Serialize ProposalAction enum to Casper bytes
 *
 * @param action - The ProposalAction variant and its parameters
 * @returns Buffer containing serialized enum data
 */
export function serializeProposalAction(action: ProposalActionParams): Buffer {
  switch (action.type) {
    case 'mint_tokens': {
      // Variant 0: MintTokens { recipient: Address, amount: U256 }
      const variantIndex = Buffer.from([0]);
      const recipient = serializeAddress(action.params.recipient);
      const amount = serializeU256(action.params.amount);
      return Buffer.concat([variantIndex, recipient, amount]);
    }

    case 'treasury_transfer': {
      // Variant 1: TreasuryTransfer { recipient: Address, amount: U256 }
      const variantIndex = Buffer.from([1]);
      const recipient = serializeAddress(action.params.recipient);
      const amount = serializeU256(action.params.amount);
      return Buffer.concat([variantIndex, recipient, amount]);
    }

    case 'update_voting_period': {
      // Variant 2: UpdateVotingPeriod { new_period: u64 }
      const variantIndex = Buffer.from([2]);
      const period = BigInt(action.params.new_period);
      const periodBytes = Buffer.alloc(8);
      periodBytes.writeBigUInt64LE(period);
      return Buffer.concat([variantIndex, periodBytes]);
    }

    case 'custom': {
      // Variant 3: Custom { description: String }
      const variantIndex = Buffer.from([3]);
      const description = serializeString(action.params.description);
      return Buffer.concat([variantIndex, description]);
    }
  }
}

/**
 * Convert ProposalAction to CLValue format for contract args
 *
 * @param action - The ProposalAction variant and its parameters
 * @returns CLValue object with ByteArray type
 */
export function proposalActionToCLValue(action: ProposalActionParams) {
  const serialized = serializeProposalAction(action);

  return {
    cl_type: 'ByteArray',
    bytes: serialized.toString('hex'),
    parsed: Array.from(serialized)
  };
}
