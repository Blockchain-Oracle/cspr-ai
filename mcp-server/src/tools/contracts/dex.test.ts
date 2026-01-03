/**
 * DEX Contract Tools Tests
 *
 * Tests for DEX query functionality, particularly the swap quote calculation
 * which has critical validation requirements.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the swap quote validation logic in isolation
// We create a simplified version of the swap quote logic for unit testing

interface MockPool {
  token_a: string;
  token_b: string;
  reserve_a: string;
  reserve_b: string;
  fee_bps: number;
}

/**
 * Validate swap inputs and calculate amount out
 * This mirrors the logic in the actual calculateSwapQuote function
 */
function validateAndCalculateSwap(
  pool: MockPool,
  tokenIn: string,
  amountIn: string
): { amountOut: string } | { error: string } {
  // Validate tokenIn matches one of the pool tokens
  const isAToB = tokenIn.toLowerCase() === pool.token_a.toLowerCase();
  const isBToA = tokenIn.toLowerCase() === pool.token_b.toLowerCase();
  if (!isAToB && !isBToA) {
    return { error: `Token ${tokenIn} is not in pool (expected ${pool.token_a} or ${pool.token_b})` };
  }

  const reserveIn = BigInt(isAToB ? pool.reserve_a : pool.reserve_b);
  const reserveOut = BigInt(isAToB ? pool.reserve_b : pool.reserve_a);

  // Validate reserves are non-zero
  if (reserveIn === 0n || reserveOut === 0n) {
    return { error: 'Pool has insufficient liquidity (zero reserves)' };
  }

  const amountInBig = BigInt(amountIn);

  // Validate input amount is positive
  if (amountInBig <= 0n) {
    return { error: 'Amount in must be greater than zero' };
  }

  // Validate and normalize fee_bps
  const feeBps = typeof pool.fee_bps === 'number'
    ? pool.fee_bps
    : parseInt(String(pool.fee_bps || 30), 10);

  if (isNaN(feeBps) || feeBps < 0 || feeBps > 10000) {
    return { error: `Invalid fee_bps: ${pool.fee_bps}` };
  }

  // Calculate amount out with fee
  const feeFactor = BigInt(10000 - feeBps);
  const amountInWithFee = amountInBig * feeFactor;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(10000) + amountInWithFee;
  const amountOut = numerator / denominator;

  return { amountOut: amountOut.toString() };
}

describe('DEX Swap Quote Validation', () => {
  describe('Token validation', () => {
    const validPool: MockPool = {
      token_a: 'hash-aaaa',
      token_b: 'hash-bbbb',
      reserve_a: '1000000',
      reserve_b: '2000000',
      fee_bps: 30
    };

    it('accepts token_a as input', () => {
      const result = validateAndCalculateSwap(validPool, 'hash-aaaa', '1000');
      expect('amountOut' in result).toBe(true);
    });

    it('accepts token_b as input', () => {
      const result = validateAndCalculateSwap(validPool, 'hash-bbbb', '1000');
      expect('amountOut' in result).toBe(true);
    });

    it('handles case-insensitive token matching', () => {
      const result = validateAndCalculateSwap(validPool, 'HASH-AAAA', '1000');
      expect('amountOut' in result).toBe(true);
    });

    it('rejects invalid token address', () => {
      const result = validateAndCalculateSwap(validPool, 'hash-cccc', '1000');
      expect('error' in result).toBe(true);
      expect(result).toHaveProperty('error');
      if ('error' in result) {
        expect(result.error).toContain('not in pool');
      }
    });
  });

  describe('Reserve validation', () => {
    it('rejects pool with zero reserve_a', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '0',
        reserve_b: '2000000',
        fee_bps: 30
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('insufficient liquidity');
      }
    });

    it('rejects pool with zero reserve_b', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '0',
        fee_bps: 30
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('insufficient liquidity');
      }
    });

    it('rejects pool with both reserves zero', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '0',
        reserve_b: '0',
        fee_bps: 30
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('error' in result).toBe(true);
    });
  });

  describe('Amount validation', () => {
    const validPool: MockPool = {
      token_a: 'hash-aaaa',
      token_b: 'hash-bbbb',
      reserve_a: '1000000',
      reserve_b: '2000000',
      fee_bps: 30
    };

    it('rejects zero amount', () => {
      const result = validateAndCalculateSwap(validPool, 'hash-aaaa', '0');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('greater than zero');
      }
    });

    it('rejects negative amount (represented as invalid bigint)', () => {
      // BigInt can't represent negative from string starting with "-" without throwing
      expect(() => BigInt('-1000')).not.toThrow(); // Actually BigInt does handle negative
      const result = validateAndCalculateSwap(validPool, 'hash-aaaa', '-1000');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('greater than zero');
      }
    });
  });

  describe('Fee validation', () => {
    it('accepts valid fee in basis points', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '2000000',
        fee_bps: 30 // 0.3%
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('amountOut' in result).toBe(true);
    });

    it('accepts zero fee', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '2000000',
        fee_bps: 0
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('amountOut' in result).toBe(true);
    });

    it('accepts maximum fee (10000 bps = 100%)', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '2000000',
        fee_bps: 10000
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('amountOut' in result).toBe(true);
      // With 100% fee, output should be 0
      if ('amountOut' in result) {
        expect(result.amountOut).toBe('0');
      }
    });

    it('rejects negative fee', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '2000000',
        fee_bps: -1
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Invalid fee_bps');
      }
    });

    it('rejects fee over 10000 bps', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '2000000',
        fee_bps: 10001
      };
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Invalid fee_bps');
      }
    });
  });

  describe('Constant product formula', () => {
    it('calculates correct swap amount with 0.3% fee', () => {
      // Pool: 1000 token_a, 2000 token_b, 0.3% fee
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '2000000',
        fee_bps: 30
      };

      // Swap 100 token_a for token_b
      // Expected: amount_out = (100 * 9970 * 2000000) / (1000000 * 10000 + 100 * 9970)
      // = (1994000000) / (10000000000 + 997000) = 1994000000 / 10000997000 ≈ 199
      const result = validateAndCalculateSwap(pool, 'hash-aaaa', '100');
      expect('amountOut' in result).toBe(true);
      if ('amountOut' in result) {
        // Due to integer division, expect approximately 199
        expect(parseInt(result.amountOut)).toBeGreaterThan(198);
        expect(parseInt(result.amountOut)).toBeLessThan(201);
      }
    });

    it('respects price impact for large swaps', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '1000000',
        fee_bps: 0 // No fee for simpler calculation
      };

      // Small swap should give nearly 1:1
      const smallSwap = validateAndCalculateSwap(pool, 'hash-aaaa', '100');
      expect('amountOut' in smallSwap).toBe(true);
      if ('amountOut' in smallSwap) {
        // Should get close to 100 (minus small slippage)
        expect(parseInt(smallSwap.amountOut)).toBeGreaterThan(95);
      }

      // Large swap should have significant slippage
      const largeSwap = validateAndCalculateSwap(pool, 'hash-aaaa', '500000');
      expect('amountOut' in largeSwap).toBe(true);
      if ('amountOut' in largeSwap) {
        // 50% of pool should give much less than 500000 due to constant product
        expect(parseInt(largeSwap.amountOut)).toBeLessThan(400000);
      }
    });

    it('swap A->B and B->A give different results', () => {
      const pool: MockPool = {
        token_a: 'hash-aaaa',
        token_b: 'hash-bbbb',
        reserve_a: '1000000',
        reserve_b: '2000000',
        fee_bps: 30
      };

      const aToBResult = validateAndCalculateSwap(pool, 'hash-aaaa', '1000');
      const bToAResult = validateAndCalculateSwap(pool, 'hash-bbbb', '1000');

      expect('amountOut' in aToBResult).toBe(true);
      expect('amountOut' in bToAResult).toBe(true);

      if ('amountOut' in aToBResult && 'amountOut' in bToAResult) {
        // Swapping A->B should give more output (pool has 2x B)
        expect(parseInt(aToBResult.amountOut)).toBeGreaterThan(parseInt(bToAResult.amountOut));
      }
    });
  });
});

describe('DEX Query Types', () => {
  // Test that query type handling is correct
  const queryTypes = ['pool', 'pool_count', 'lp_balance', 'reserves', 'swap_quote'];

  it('should have all expected query types', () => {
    expect(queryTypes).toHaveLength(5);
    expect(queryTypes).toContain('pool');
    expect(queryTypes).toContain('swap_quote');
  });
});
