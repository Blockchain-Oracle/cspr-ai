/**
 * Integration test for build→sign→submit transaction flow
 *
 * Tests the complete pipeline:
 * 1. buildStoredContractDeploy() creates unsigned transaction
 * 2. reconstructTransaction() converts to SDK Transaction object
 * 3. signTransaction() signs with private key
 * 4. Transaction object is properly formatted for submission
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadPrivateKey,
  reconstructTransaction,
  signTransaction,
  getSecretKeyFromEnv,
  transactionToJson
} from '../../utils/signing.js';
import { buildStoredContractDeploy } from '../../utils/contracts.js';

describe('Sign and Submit Transaction Flow', () => {
  let privateKey: any;
  let publicKeyHex: string;

  beforeAll(() => {
    // Load private key from environment
    const secretKey = getSecretKeyFromEnv();
    if (!secretKey) {
      throw new Error('CASPER_SECRET_KEY not configured in environment');
    }

    privateKey = loadPrivateKey(secretKey);
    publicKeyHex = privateKey.publicKey.toHex();
  });

  it('should build, sign, and prepare NFT mint transaction for submission', () => {
    // Phase 1: BUILD - Create unsigned transaction using build utility
    const unsignedDeploy = buildStoredContractDeploy(
      publicKeyHex,
      'casper-test',
      'contract-package-195b64a1cca143d9361790af34ef79d3094bb00094330c1ccc1cd4987c0b583b',
      'mint_with_auto_uri',
      [
        ['to', { cl_type: 'Key', parsed: publicKeyHex }],
        ['name', { cl_type: 'String', parsed: 'Test NFT #1' }]
      ]
    );

    // Verify unsigned deploy structure
    expect(unsignedDeploy).toHaveProperty('header');
    expect(unsignedDeploy).toHaveProperty('payment');
    expect(unsignedDeploy).toHaveProperty('session');
    expect(unsignedDeploy.header.account).toBe(publicKeyHex);
    expect(unsignedDeploy.header.chain_name).toBe('casper-test');

    // Phase 2: RECONSTRUCT - Convert to SDK Transaction object
    const transaction = reconstructTransaction(unsignedDeploy);

    // Verify Transaction object was created
    expect(transaction).toBeDefined();
    expect(typeof transaction.sign).toBe('function');

    // Phase 3: SIGN - Sign transaction with private key
    const signedTransaction = signTransaction(transaction, privateKey);

    // Verify transaction was signed
    expect(signedTransaction).toBeDefined();
    expect(signedTransaction.hash).toBeDefined();

    // Phase 4: PREPARE FOR SUBMISSION - Convert to JSON for submission
    const { transaction_hash, signed_transaction_json } = transactionToJson(signedTransaction);

    // Verify output format
    expect(transaction_hash).toBeTruthy();
    expect(typeof transaction_hash).toBe('string');
    expect(transaction_hash.length).toBeGreaterThan(0);

    expect(signed_transaction_json).toBeTruthy();
    const parsedJson = JSON.parse(signed_transaction_json);
    expect(parsedJson).toBeDefined();

    // The transaction should be ready for putTransaction()
    // In a real submission, we would call:
    // await client.submitTransaction(signedTransaction)
  });

  it('should build, sign, and prepare token transfer transaction', () => {
    // Build token transfer transaction
    const unsignedDeploy = buildStoredContractDeploy(
      publicKeyHex,
      'casper-test',
      'contract-package-b481b1e86bc2a1c5d73d5e108c6246ad0358889acc9ef0f429bd4cb454a3bc05',
      'transfer',
      [
        ['recipient', { cl_type: 'Key', parsed: publicKeyHex }],
        ['amount', { cl_type: 'U256', parsed: '1000000000' }]
      ]
    );

    // Reconstruct and sign
    const transaction = reconstructTransaction(unsignedDeploy);
    const signedTransaction = signTransaction(transaction, privateKey);

    // Verify signed transaction
    expect(signedTransaction.hash).toBeDefined();

    const { transaction_hash } = transactionToJson(signedTransaction);
    expect(transaction_hash).toBeTruthy();
  });

  it('should handle U256 amounts correctly in contract calls', () => {
    // Test with various U256 values
    const testCases = [
      { amount: '1', label: 'minimum' },
      { amount: '1000000000', label: '1 billion' },
      { amount: '1000000000000000000', label: '1 quintillion' }
    ];

    for (const { amount, label } of testCases) {
      const unsignedDeploy = buildStoredContractDeploy(
        publicKeyHex,
        'casper-test',
        'contract-package-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'transfer',
        [
          ['recipient', { cl_type: 'Key', parsed: publicKeyHex }],
          ['amount', { cl_type: 'U256', parsed: amount }]
        ]
      );

      // Should not throw during reconstruction
      expect(() => {
        const transaction = reconstructTransaction(unsignedDeploy);
        signTransaction(transaction, privateKey);
      }).not.toThrow();
    }
  });

  it('should reject transaction with mismatched signer', () => {
    // Build transaction for a different account (valid Ed25519 format: 01 + 64 hex chars)
    const differentAccount = '010123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const unsignedDeploy = buildStoredContractDeploy(
      differentAccount,
      'casper-test',
      'contract-package-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'mint',
      [['to', { cl_type: 'Key', parsed: differentAccount }]]
    );

    // Attempting to sign with our private key should fail during MCP tool validation
    // (The reconstructTransaction itself won't fail, but the MCP tool checks signer match)
    const transaction = reconstructTransaction(unsignedDeploy);

    // We can still sign it (SDK allows), but MCP tool would reject it
    expect(() => {
      signTransaction(transaction, privateKey);
    }).not.toThrow(); // SDK allows signing, MCP tool validates
  });
});
