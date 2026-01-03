/**
 * Test NFT and DEX build → sign → submit flow
 * Focus: Can MCP tools build valid transactions for these operations?
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import {
  getSecretKeyFromEnv,
  loadPrivateKey,
  reconstructTransaction,
  signTransaction
} from './dist/utils/signing.js';

import { CasperClient } from './dist/services/casper-client.js';

const secretKey = getSecretKeyFromEnv();
const privateKey = loadPrivateKey(secretKey);
const publicKey = privateKey.publicKey.toHex();

const client = new CasperClient('https://node.testnet.casper.network/rpc');

function extractHash(addr) {
  return addr.replace('contract-package-', '').replace('hash-', '');
}

const TOKEN_CONTRACT = extractHash(process.env.CASPER_TOKEN_CONTRACT_ADDRESS);
const NFT_CONTRACT = extractHash(process.env.CASPER_NFT_CONTRACT_ADDRESS);
const DEX_CONTRACT = extractHash(process.env.CASPER_DEX_CONTRACT_ADDRESS);

async function testBuildSignSubmit(name, unsignedTx) {
  console.log(`\n=== ${name} ===`);
  
  try {
    // Step 1: Build (reconstruct transaction)
    console.log('1️⃣  Building transaction...');
    const transaction = reconstructTransaction(unsignedTx);
    console.log('   ✅ Transaction built successfully');
    
    // Step 2: Sign
    console.log('2️⃣  Signing transaction...');
    signTransaction(transaction, privateKey);
    console.log('   ✅ Transaction signed successfully');
    
    // Step 3: Submit
    console.log('3️⃣  Submitting to network...');
    const txHash = await client.submitTransaction(transaction);
    console.log('   ✅ Transaction submitted successfully');
    console.log(`   Hash: ${txHash}`);
    console.log(`   Explorer: https://testnet.cspr.live/deploy/${txHash}`);
    
    return { success: true, hash: txHash };
  } catch (error) {
    console.log('   ❌ FAILED:', error.message);
    return { success: false, error: error.message };
  }
}

console.log('Testing MCP Build → Sign → Submit Flow');
console.log('========================================');

// Test 1: NFT Mint (fix: check if contract requires owner)
const nftMint = {
  header: {
    account: publicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: NFT_CONTRACT,
      entry_point: 'mint',
      hash_type: 'package',
      args: [
        ['to', { cl_type: 'Key', parsed: publicKey }],
        ['token_name', { cl_type: 'String', parsed: 'Sign Submit Test NFT' }],
        ['token_uri', { cl_type: 'String', parsed: 'ipfs://sign-submit-test' }]
      ]
    }
  }
};

const result1 = await testBuildSignSubmit('NFT Mint', nftMint);

await new Promise(resolve => setTimeout(resolve, 2000));

// Test 2: DEX Create Pool (fix: use valid token addresses)
const dexCreatePool = {
  header: {
    account: publicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: DEX_CONTRACT,
      entry_point: 'create_pool',
      hash_type: 'package',
      args: [
        // Use actual token contract for token_a
        ['token_a', { cl_type: 'String', parsed: TOKEN_CONTRACT }],
        // Use same token for token_b (self-pool for testing)
        ['token_b', { cl_type: 'String', parsed: TOKEN_CONTRACT }]
      ]
    }
  }
};

const result2 = await testBuildSignSubmit('DEX Create Pool (same token pair)', dexCreatePool);

console.log('\n========================================');
console.log('SUMMARY');
console.log('========================================');
console.log('NFT Mint:', result1.success ? '✅ Flow works' : '❌ Failed');
console.log('DEX Create Pool:', result2.success ? '✅ Flow works' : '❌ Failed');
console.log('\nKey Question: Did transactions build, sign, and submit?');
console.log('(Execution success will be checked separately)');
