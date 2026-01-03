/**
 * Test using contract hash instead of package hash
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import casperSdk from 'casper-js-sdk';
const { PublicKey, ContractCallBuilder, Args, CLValue } = casperSdk;

import { getSecretKeyFromEnv, loadPrivateKey } from './dist/utils/signing.js';
import { CasperClient } from './dist/services/casper-client.js';

const secretKey = getSecretKeyFromEnv();
const privateKey = loadPrivateKey(secretKey);
const publicKey = privateKey.publicKey;
const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);
const CHAIN_NAME = client.getChainName();

console.log('=== Contract Hash Call Test ===');
console.log('Public Key:', publicKey.toHex());
console.log();

// Use actual contract hash instead of package hash
const CONTRACT_HASH = '80e8bdb30f9372986ca9df338d72cae9a7bff6ee2dc1b813eed5a1bce8ebcc83';

const transaction = new ContractCallBuilder()
  .byContractHash(CONTRACT_HASH)  // Use byContractHash instead of byPackageHash
  .from(publicKey)
  .entryPoint('name')
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({}))
  .ttl(30 * 60 * 1000)
  .payment(100_000_000)
  .build();

console.log('Transaction JSON:');
console.log(JSON.stringify(transaction.toJSON(), null, 2));
console.log();

try {
  transaction.sign(privateKey);
  console.log('Signed successfully');
  console.log();

  console.log('Submitting...');
  const txHash = await client.submitTransaction(transaction);

  console.log('✅ SUCCESS');
  console.log('Transaction Hash:', txHash);
  console.log('Explorer:', `https://testnet.cspr.live/deploy/${txHash}`);
} catch (error) {
  console.log('❌ FAILED');
  console.log('Error:', error.message);
  if (error.stack) {
    console.log('Stack:', error.stack);
  }
}
