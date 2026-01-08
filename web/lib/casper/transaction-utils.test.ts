/**
 * Unit tests for transaction-utils.ts
 * Tests the utility functions for transaction format conversion
 */

import { describe, it, expect } from 'vitest';
import {
  decodeU512Bytes,
  encodeU512ToBytes,
  parseTtlToMilliseconds,
  needsConversion,
} from './transaction-utils';

// ============================================================================
// U512 Encoding/Decoding Tests
// ============================================================================

describe('decodeU512Bytes', () => {
  it('should decode zero value', () => {
    expect(decodeU512Bytes('00')).toBe(0n);
  });

  it('should decode small single-byte values', () => {
    // 01 = length 1, 64 = 100 in decimal
    expect(decodeU512Bytes('0164')).toBe(100n);
    // 01 = length 1, ff = 255
    expect(decodeU512Bytes('01ff')).toBe(255n);
  });

  it('should decode multi-byte little-endian values', () => {
    // 02 = length 2, e8 03 = 1000 in little-endian (0x03e8)
    expect(decodeU512Bytes('02e803')).toBe(1000n);
    // 04 = length 4, 00 e1 f5 05 = 100_000_000 in little-endian (0x05f5e100)
    expect(decodeU512Bytes('0400e1f505')).toBe(100_000_000n);
  });

  it('should decode large values (payment amounts)', () => {
    // 100_000_000 motes (0.1 CSPR) - 0x05F5E100 in little-endian
    expect(decodeU512Bytes('0400e1f505')).toBe(100_000_000n);
    // 1_000_000_000 motes (1 CSPR) - 0x3B9ACA00 in little-endian
    expect(decodeU512Bytes('0400ca9a3b')).toBe(1_000_000_000n);
    // 3_000_000_000 motes (3 CSPR) - 0xB2D05E00 in little-endian
    expect(decodeU512Bytes('04005ed0b2')).toBe(3_000_000_000n);
  });

  it('should decode very large values', () => {
    // 1 trillion motes - 0xE8D4A51000 in little-endian
    expect(decodeU512Bytes('050010a5d4e8')).toBe(1_000_000_000_000n);
  });

  it('should handle 0x prefix', () => {
    expect(decodeU512Bytes('0x0164')).toBe(100n);
    expect(decodeU512Bytes('0x00')).toBe(0n);
  });

  it('should throw on invalid hex string', () => {
    expect(() => decodeU512Bytes('0xgg')).toThrow('Invalid hex string');
    expect(() => decodeU512Bytes('not-hex')).toThrow('Invalid hex string');
  });

  it('should throw on too-short hex string', () => {
    expect(() => decodeU512Bytes('0')).toThrow('Hex string too short');
    expect(() => decodeU512Bytes('')).toThrow('Hex string too short');
  });

  it('should throw on mismatched length prefix', () => {
    // Claims 2 bytes but only has 1
    expect(() => decodeU512Bytes('0264')).toThrow('Invalid U512 encoding');
  });
});

describe('encodeU512ToBytes', () => {
  it('should encode zero value', () => {
    expect(encodeU512ToBytes(0n)).toBe('00');
  });

  it('should encode small values', () => {
    expect(encodeU512ToBytes(100n)).toBe('0164');
    expect(encodeU512ToBytes(255n)).toBe('01ff');
  });

  it('should encode multi-byte values in little-endian', () => {
    expect(encodeU512ToBytes(1000n)).toBe('02e803');
    expect(encodeU512ToBytes(256n)).toBe('020001'); // 0x100 -> 00 01 in LE
  });

  it('should encode payment amounts correctly', () => {
    // 0.1 CSPR = 100_000_000 motes
    expect(encodeU512ToBytes(100_000_000n)).toBe('0400e1f505');
    // 1 CSPR = 1_000_000_000 motes
    expect(encodeU512ToBytes(1_000_000_000n)).toBe('0400ca9a3b');
    // 3 CSPR = 3_000_000_000 motes
    expect(encodeU512ToBytes(3_000_000_000n)).toBe('04005ed0b2');
  });

  it('should encode very large values', () => {
    // 1 trillion motes
    expect(encodeU512ToBytes(1_000_000_000_000n)).toBe('050010a5d4e8');
  });

  it('should throw on negative values', () => {
    expect(() => encodeU512ToBytes(-1n)).toThrow('U512 cannot be negative');
    expect(() => encodeU512ToBytes(-1000n)).toThrow('U512 cannot be negative');
  });

  it('should be reversible with decodeU512Bytes', () => {
    const testValues = [
      0n,
      1n,
      100n,
      255n,
      256n,
      1000n,
      100_000_000n,
      1_000_000_000n,
      3_000_000_000n,
      1_000_000_000_000n,
      BigInt('999999999999999999999'),
    ];

    for (const value of testValues) {
      const encoded = encodeU512ToBytes(value);
      const decoded = decodeU512Bytes(encoded);
      expect(decoded).toBe(value);
    }
  });
});

// ============================================================================
// TTL Parsing Tests
// ============================================================================

describe('parseTtlToMilliseconds', () => {
  it('should parse milliseconds format', () => {
    expect(parseTtlToMilliseconds('1000ms')).toBe(1000);
    expect(parseTtlToMilliseconds('1800000ms')).toBe(1800000);
  });

  it('should parse seconds format', () => {
    expect(parseTtlToMilliseconds('60s')).toBe(60000);
    expect(parseTtlToMilliseconds('1s')).toBe(1000);
    expect(parseTtlToMilliseconds('300s')).toBe(300000);
  });

  it('should parse minutes format', () => {
    expect(parseTtlToMilliseconds('30m')).toBe(1800000);
    expect(parseTtlToMilliseconds('1m')).toBe(60000);
    expect(parseTtlToMilliseconds('60m')).toBe(3600000);
  });

  it('should parse hours format', () => {
    expect(parseTtlToMilliseconds('1h')).toBe(3600000);
    expect(parseTtlToMilliseconds('2h')).toBe(7200000);
    expect(parseTtlToMilliseconds('24h')).toBe(86400000);
  });

  it('should parse raw numeric string as milliseconds', () => {
    expect(parseTtlToMilliseconds('1000')).toBe(1000);
    expect(parseTtlToMilliseconds('1800000')).toBe(1800000);
  });

  it('should throw on invalid format', () => {
    expect(() => parseTtlToMilliseconds('30x')).toThrow('Invalid TTL format');
    expect(() => parseTtlToMilliseconds('abc')).toThrow('Invalid TTL format');
    expect(() => parseTtlToMilliseconds('')).toThrow('Invalid TTL format');
    expect(() => parseTtlToMilliseconds('m30')).toThrow('Invalid TTL format');
  });
});

// ============================================================================
// needsConversion Tests
// ============================================================================

describe('needsConversion', () => {
  it('should return false for null/undefined', () => {
    expect(needsConversion(null)).toBe(false);
    expect(needsConversion(undefined)).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(needsConversion('string')).toBe(false);
    expect(needsConversion(123)).toBe(false);
    expect(needsConversion(true)).toBe(false);
  });

  it('should return true for simplified format with deploy_type', () => {
    expect(needsConversion({ deploy_type: 'transfer' })).toBe(true);
    expect(needsConversion({ deploy_type: 'contract_call' })).toBe(true);
  });

  it('should return true for simplified format with contract_address', () => {
    expect(needsConversion({ contract_address: 'hash-abc123' })).toBe(true);
  });

  it('should return true for simplified format with entry_point', () => {
    expect(needsConversion({ entry_point: 'transfer' })).toBe(true);
  });

  it('should return true for Transaction V1 format (lowercase session keys)', () => {
    expect(needsConversion({
      header: { account: '01abc', chain_name: 'casper-test', gas_price: 1, ttl: '30m' },
      session: { transfer: { args: [] } },
      payment: { module_bytes: { args: [] } }
    })).toBe(true);

    expect(needsConversion({
      header: { account: '01abc', chain_name: 'casper-test', gas_price: 1, ttl: '30m' },
      session: { stored_contract_by_hash: { hash: 'abc', entry_point: 'test', args: [] } },
      payment: { module_bytes: { args: [] } }
    })).toBe(true);
  });

  it('should return true for objects missing hash or body_hash', () => {
    expect(needsConversion({
      header: { account: '01abc', chain_name: 'casper-test', gas_price: 1, ttl: '30m' },
      session: { Transfer: { args: [] } },
      payment: { ModuleBytes: { args: [] } }
    })).toBe(true);

    expect(needsConversion({
      hash: 'abc',
      header: { account: '01abc', chain_name: 'casper-test', gas_price: 1, ttl: '30m' },
      session: { Transfer: { args: [] } },
      payment: { ModuleBytes: { args: [] } }
    })).toBe(true);
  });

  it('should return false for properly formatted Deploy (PascalCase with hash and body_hash)', () => {
    expect(needsConversion({
      hash: 'abc123',
      header: {
        account: '01abc',
        body_hash: 'def456',
        chain_name: 'casper-test',
        gas_price: 1,
        ttl: '30m'
      },
      session: { Transfer: { args: [] } },
      payment: { ModuleBytes: { args: [] } }
    })).toBe(false);

    expect(needsConversion({
      hash: 'abc123',
      header: {
        account: '01abc',
        body_hash: 'def456',
        chain_name: 'casper-test',
        gas_price: 1,
        ttl: '30m'
      },
      session: { StoredContractByHash: { hash: 'abc', entry_point: 'test', args: [] } },
      payment: { ModuleBytes: { args: [] } }
    })).toBe(false);
  });
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('U512 Edge Cases', () => {
  it('should handle boundary values', () => {
    // Maximum single byte
    expect(encodeU512ToBytes(255n)).toBe('01ff');
    expect(decodeU512Bytes('01ff')).toBe(255n);

    // Just over single byte
    expect(encodeU512ToBytes(256n)).toBe('020001');
    expect(decodeU512Bytes('020001')).toBe(256n);

    // Max two bytes
    expect(encodeU512ToBytes(65535n)).toBe('02ffff');
    expect(decodeU512Bytes('02ffff')).toBe(65535n);
  });

  it('should handle case-insensitive hex', () => {
    expect(decodeU512Bytes('0400E1F505')).toBe(100_000_000n);
    expect(decodeU512Bytes('0400e1f505')).toBe(100_000_000n);
    expect(decodeU512Bytes('0400E1f505')).toBe(100_000_000n);
  });
});
