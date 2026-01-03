/**
 * Test Contract Call Transactions
 *
 * Uses proper SDK builders to test:
 * 1. DAO operations
 * 2. NFT operations
 * 3. Token operations
 * 4. DEX operations
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import casperSdk from 'casper-js-sdk';
const { PublicKey, ContractCallBuilder, Args, CLValue } = casperSdk;

import {
  getSecretKeyFromEnv,
  loadPrivateKey
} from './dist/utils/signing.js';

import { CasperClient } from './dist/services/casper-client.js';

// Initialize
const secretKey = getSecretKeyFromEnv();
const privateKey = loadPrivateKey(secretKey);
const publicKey = privateKey.publicKey;
const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);
const CHAIN_NAME = client.getChainName();

console.log('=== Contract Call Testing ===');
console.log('Public Key:', publicKey.toHex());
console.log('Network:', CHAIN_NAME);
console.log();

// Helper to extract hash from contract-package- prefix
function extractHash(contractAddress) {
  if (contractAddress.startsWith('contract-package-')) {
    return contractAddress.replace('contract-package-', '');
  }
  if (contractAddress.startsWith('hash-')) {
    return contractAddress.replace('hash-', '');
  }
  return contractAddress;
}

// Helper to submit transaction
async function submitTx(name, transaction) {
  console.log(`\n--- ${name} ---`);

  try {
    // Sign
    transaction.sign(privateKey);

    // Submit
    const txHash = await client.submitTransaction(transaction);

    console.log('✅ SUCCESS');
    console.log('Transaction Hash:', txHash);
    console.log('Explorer:', `https://testnet.cspr.live/deploy/${txHash}`);

    return txHash;
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Error:', error.message);
    return null;
  }
}

// Wait helper
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract contract hashes
const DAO_HASH = extractHash(process.env.CASPER_DAO_CONTRACT_ADDRESS);
const NFT_HASH = extractHash(process.env.CASPER_NFT_CONTRACT_ADDRESS);
const TOKEN_HASH = extractHash(process.env.CASPER_TOKEN_CONTRACT_ADDRESS);
const DEX_HASH = extractHash(process.env.CASPER_DEX_CONTRACT_ADDRESS);

console.log('\n=== Contract Addresses ===');
console.log('DAO:', DAO_HASH);
console.log('NFT:', NFT_HASH);
console.log('Token:', TOKEN_HASH);
console.log('DEX:', DEX_HASH);

// ============================================================================
// DAO OPERATIONS
// ============================================================================

console.log('\n=== DAO OPERATIONS ===');

// 1. Create DAO Proposal
const proposal = new ContractCallBuilder()
  .byPackageHash(DAO_HASH, null)
  .from(publicKey)
  .entryPoint('propose')
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({
    description: CLValue.newCLString('MCP Test Proposal'),
    action_type: CLValue.newCLString('custom'),
    action_params: CLValue.newCLString('{"custom_description":"Testing proposal creation"}')
  }))
  .ttl(30 * 60 * 1000)
  .payment(300_000_000)
  .build();

await submitTx('DAO: Create Proposal', proposal);
await wait(2000);

// 2. Vote on Proposal (assuming proposal_id 0 exists)
const vote = new ContractCallBuilder()
  .byPackageHash(DAO_HASH, null)
  .from(publicKey)
  .entryPoint('vote')
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({
    proposal_id: CLValue.newCLUint64(0),
    support: CLValue.newCLValueBool(true),
    amount: CLValue.newCLUInt512('1000000000')
  }))
  .ttl(30 * 60 * 1000)
  .payment(200_000_000)
  .build();

await submitTx('DAO: Vote on Proposal', vote);

// ============================================================================
// NFT OPERATIONS
// ============================================================================

console.log('\n=== NFT OPERATIONS ===');

await wait(2000);

// 3. Mint NFT
const nftMint = new ContractCallBuilder()
  .byPackageHash(NFT_HASH, null)
  .from(publicKey)
  .entryPoint('mint')
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({
    to: CLValue.newCLPublicKey(publicKey),
    token_name: CLValue.newCLString('MCP Test NFT'),
    token_uri: CLValue.newCLString('ipfs://test-nft-metadata')
  }))
  .ttl(30 * 60 * 1000)
  .payment(300_000_000)
  .build();

await submitTx('NFT: Mint', nftMint);

// ============================================================================
// TOKEN OPERATIONS
// ============================================================================

console.log('\n=== TOKEN OPERATIONS ===');

await wait(2000);

// 4. Mint Token
const tokenMint = new ContractCallBuilder()
  .byPackageHash(TOKEN_HASH, null)
  .from(publicKey)
  .entryPoint('mint')
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({
    recipient: CLValue.newCLPublicKey(publicKey),
    amount: CLValue.newCLUInt256('1000000000')
  }))
  .ttl(30 * 60 * 1000)
  .payment(250_000_000)
  .build();

await submitTx('Token: Mint', tokenMint);

// ============================================================================
// DEX OPERATIONS
// ============================================================================

console.log('\n=== DEX OPERATIONS ===');

await wait(2000);

// 5. Create Pool
const createPool = new ContractCallBuilder()
  .byPackageHash(DEX_HASH, null)
  .from(publicKey)
  .entryPoint('create_pool')
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({
    token_a: CLValue.newCLString(TOKEN_HASH),
    token_b: CLValue.newCLString('0000000000000000000000000000000000000000000000000000000000000000')
  }))
  .ttl(30 * 60 * 1000)
  .payment(300_000_000)
  .build();

await submitTx('DEX: Create Pool', createPool);

console.log('\n=== TESTING COMPLETE ===');
console.log('All transaction types tested with Transaction V1 format');
