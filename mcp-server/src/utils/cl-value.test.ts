/**
 * CLValue Extraction Utility Tests
 */
import { describe, it, expect } from 'vitest';
import { extractCLValue, toSafeString } from './cl-value.js';

describe('extractCLValue', () => {
  it('returns null for null/undefined input', () => {
    expect(extractCLValue(null)).toBeNull();
    expect(extractCLValue(undefined)).toBeNull();
  });

  it('extracts parsed value from CLValue wrapper', () => {
    const stored = {
      CLValue: {
        cl_type: 'U256',
        bytes: '0a',
        parsed: '1000000000'
      }
    };
    expect(extractCLValue(stored)).toBe('1000000000');
  });

  it('falls back to bytes when parsed is not available', () => {
    const stored = {
      CLValue: {
        cl_type: 'Any',
        bytes: 'deadbeef'
      }
    };
    expect(extractCLValue(stored)).toBe('deadbeef');
  });

  it('handles parsed value of 0', () => {
    const stored = {
      CLValue: {
        cl_type: 'U64',
        bytes: '00',
        parsed: 0
      }
    };
    expect(extractCLValue(stored)).toBe(0);
  });

  it('handles parsed value of empty string', () => {
    const stored = {
      CLValue: {
        cl_type: 'String',
        bytes: '',
        parsed: ''
      }
    };
    expect(extractCLValue(stored)).toBe('');
  });

  it('handles parsed value of false', () => {
    const stored = {
      CLValue: {
        cl_type: 'Bool',
        bytes: '00',
        parsed: false
      }
    };
    expect(extractCLValue(stored)).toBe(false);
  });

  it('returns direct value when not wrapped in CLValue', () => {
    expect(extractCLValue({ key: 'value' })).toEqual({ key: 'value' });
    expect(extractCLValue('simple string')).toBe('simple string');
    expect(extractCLValue(12345)).toBe(12345);
  });

  it('handles nested objects in parsed value', () => {
    const stored = {
      CLValue: {
        cl_type: 'Map',
        bytes: 'abc',
        parsed: { token_a: 'hash-abc', token_b: 'hash-def' }
      }
    };
    expect(extractCLValue(stored)).toEqual({ token_a: 'hash-abc', token_b: 'hash-def' });
  });

  it('handles array in parsed value', () => {
    const stored = {
      CLValue: {
        cl_type: 'Tuple3',
        bytes: 'abc',
        parsed: ['value1', 'value2', 'value3']
      }
    };
    expect(extractCLValue(stored)).toEqual(['value1', 'value2', 'value3']);
  });
});

describe('toSafeString', () => {
  it('returns string as-is', () => {
    expect(toSafeString('hello')).toBe('hello');
    expect(toSafeString('12345')).toBe('12345');
  });

  it('converts numbers to string', () => {
    expect(toSafeString(123)).toBe('123');
    expect(toSafeString(0)).toBe('0');
    expect(toSafeString(-42)).toBe('-42');
  });

  it('converts bigint to string', () => {
    expect(toSafeString(BigInt(1000000000000))).toBe('1000000000000');
    expect(toSafeString(BigInt(0))).toBe('0');
  });

  it('returns default for null/undefined', () => {
    expect(toSafeString(null)).toBe('0');
    expect(toSafeString(undefined)).toBe('0');
    expect(toSafeString(null, 'default')).toBe('default');
    expect(toSafeString(undefined, 'N/A')).toBe('N/A');
  });

  it('returns default for non-stringifiable values', () => {
    expect(toSafeString({}, '0')).toBe('0');
    expect(toSafeString([], '0')).toBe('0');
  });
});
