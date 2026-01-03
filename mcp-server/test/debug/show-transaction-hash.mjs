/**
 * Quick script to show transaction hash from signing process
 * This does NOT submit to the network - just demonstrates the hash generation
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

import {
  loadPrivateKey,
  reconstructTransaction,
  signTransaction,
  getSecretKeyFromEnv,
  transactionToJson
} from './dist/utils/signing.js';
import { buildStoredContractDeploy } from './dist/utils/contracts.js';

// Load private key from environment
const secretKey = getSecretKeyFromEnv();
if (!secretKey) {
  throw new Error('CASPER_SECRET_KEY not configured in environment');
}

const privateKey = loadPrivateKey(secretKey);
const publicKeyHex = privateKey.publicKey.toHex();

console.log('=== Signing Demo Transaction ===\n');
console.log(`Signer Public Key: ${publicKeyHex}\n`);

// Build an NFT mint transaction (from environment variable)
const nftContractAddress = process.env.CASPER_NFT_CONTRACT_ADDRESS;
if (!nftContractAddress) {
  throw new Error('CASPER_NFT_CONTRACT_ADDRESS not configured');
}

console.log(`NFT Contract: ${nftContractAddress}\n`);

const unsignedDeploy = buildStoredContractDeploy(
  publicKeyHex,
  'casper-test',
  nftContractAddress,
  'mint_with_auto_uri',
  [
    ['to', { cl_type: 'Key', parsed: publicKeyHex }],
    ['name', { cl_type: 'String', parsed: 'Demo NFT #1' }]
  ]
);

console.log('Building transaction...');
const transaction = reconstructTransaction(unsignedDeploy);

console.log('Signing transaction...');
const signedTransaction = signTransaction(transaction, privateKey);

console.log('Formatting for submission...\n');
const { transaction_hash, signed_transaction_json } = transactionToJson(signedTransaction);

console.log('=== TRANSACTION HASH ===');
console.log(transaction_hash);
console.log('\n=== TRANSACTION DETAILS ===');
const txJson = JSON.parse(signed_transaction_json);
console.log(`Entry Point: ${txJson.session?.stored_contract_by_hash?.entry_point || 'N/A'}`);
console.log(`Chain Name: ${txJson.header?.chain_name || 'N/A'}`);
console.log(`Has Signature: ${txJson.approvals?.length > 0 ? 'Yes' : 'No'}`);
console.log('\n=== FULL DEPLOY JSON ===');
console.log(JSON.stringify(txJson, null, 2));

console.log('\n=== NOTE ===');
console.log('This transaction was NOT submitted to the network.');
console.log('This is just a demonstration of the signing process.');
console.log('To submit, use: casper_sign_and_submit_transaction tool');
