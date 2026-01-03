/**
 * Test a simple contract call submission
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

console.log('=== Simple Contract Call Test ===');
console.log('Public Key:', publicKey.toHex());
console.log();

// Try calling a simple method on the token contract
const TOKEN_HASH = 'b481b1e86bc2a1c5d73d5e108c6246ad0358889acc9ef0f429bd4cb454a3bc05';

const transaction = new ContractCallBuilder()
  .byPackageHash(TOKEN_HASH, null)
  .from(publicKey)
  .entryPoint('name')  // Simple read-only entry point
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({}))  // No args needed
  .ttl(30 * 60 * 1000)
  .payment(100_000_000)  // Same as working native transfer
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
