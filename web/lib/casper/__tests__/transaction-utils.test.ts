/**
 * Test transaction format conversion utility
 * Verifies MCP Transaction V1 → Deploy format conversion
 */

import { convertToDeployFormat, needsConversion } from '../transaction-utils';

describe('Transaction Utils', () => {
  describe('needsConversion', () => {
    it('should detect Transaction V1 format (lowercase session keys)', () => {
      const transactionV1 = {
        header: { account: '01abc', chain_name: 'casper-test', gas_price: 1, ttl: '30m' },
        payment: { module_bytes: { args: [] } },
        session: { transfer: { args: [] } }, // lowercase key
      };

      expect(needsConversion(transactionV1)).toBe(true);
    });

    it('should detect Deploy format (PascalCase session keys)', () => {
      const deployFormat = {
        header: { account: '01abc', chain_name: 'casper-test', gas_price: 1, ttl: '30m' },
        payment: { ModuleBytes: { args: [] } },
        session: { Transfer: { args: [] } }, // PascalCase key
      };

      expect(needsConversion(deployFormat)).toBe(false);
    });

    it('should detect stored_contract_by_hash as Transaction V1', () => {
      const transactionV1 = {
        header: { account: '01abc', chain_name: 'casper-test', gas_price: 1, ttl: '30m' },
        payment: { module_bytes: { args: [] } },
        session: { stored_contract_by_hash: { hash: 'abc', entry_point: 'test', args: [] } },
      };

      expect(needsConversion(transactionV1)).toBe(true);
    });
  });

  describe('convertToDeployFormat', () => {
    it('should convert simple Transfer transaction', () => {
      const publicKey = '0202a0b5a84567107fd267ec09e6c6f35560e9f6ca0e5e7e97e7f1f8f4a2e5b8f3e7e0';

      const transactionV1 = {
        header: {
          account: publicKey,
          chain_name: 'casper-test',
          gas_price: 1,
          ttl: '30m',
        },
        payment: {
          module_bytes: {
            args: [['amount', { cl_type: 'U512', parsed: '100000000' }]],
          },
        },
        session: {
          transfer: {
            args: [
              ['amount', { cl_type: 'U512', parsed: '2500000000' }],
              ['target', { cl_type: 'Key', parsed: publicKey }],
              ['id', { cl_type: 'U64', parsed: 1 }],
            ],
          },
        },
      };

      const result = convertToDeployFormat(transactionV1);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('header');
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('session');
      expect(result).toHaveProperty('hash');
    });

    it('should throw error for invalid transaction structure', () => {
      const invalidTransaction = {
        header: { account: 'invalid', chain_name: 'test' },
        // Missing required fields
      };

      expect(() => {
        convertToDeployFormat(invalidTransaction);
      }).toThrow();
    });

    it('should handle delegation transaction', () => {
      const delegatorKey = '0202a0b5a84567107fd267ec09e6c6f35560e9f6ca0e5e7e97e7f1f8f4a2e5b8f3e7e0';
      const validatorKey = '0202b1c6b95678218fe378fd1ae7d7g46671fag7db1f6f8faf8g8g2g9g5b3f9g4f8f1';

      const delegationTx = {
        header: {
          account: delegatorKey,
          chain_name: 'casper-test',
          gas_price: 1,
          ttl: '30m',
        },
        payment: {
          module_bytes: {
            args: [['amount', { cl_type: 'U512', parsed: '2500000000' }]],
          },
        },
        session: {
          stored_contract_by_name: {
            name: 'auction',
            entry_point: 'delegate',
            args: [
              ['validator', { cl_type: 'Key', parsed: validatorKey }],
              ['amount', { cl_type: 'U512', parsed: '500000000000' }],
            ],
          },
        },
      };

      const result = convertToDeployFormat(delegationTx);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('session');
    });

    it('should throw error for module_bytes session type', () => {
      const moduleBytesTx = {
        header: {
          account: '0202a0b5a84567107fd267ec09e6c6f35560e9f6ca0e5e7e97e7f1f8f4a2e5b8f3e7e0',
          chain_name: 'casper-test',
          gas_price: 1,
          ttl: '30m',
        },
        payment: {
          module_bytes: {
            args: [['amount', { cl_type: 'U512', parsed: '100000000' }]],
          },
        },
        session: {
          module_bytes: {
            module_bytes: 'deadbeef',
            args: [],
          },
        },
      };

      expect(() => {
        convertToDeployFormat(moduleBytesTx);
      }).toThrow('module_bytes session type not supported in browser');
    });
  });
});
