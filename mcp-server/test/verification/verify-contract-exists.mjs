/**
 * Verify the NFT contract actually exists on testnet
 * Based on Discord logs suggesting "no such contract at hash" errors
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import { CasperClient } from './dist/services/casper-client.js';

const TESTNET_RPC = 'https://node.testnet.casper.network/rpc';

async function verifyContractExists() {
  console.log('=== VERIFYING CONTRACT EXISTS ON TESTNET ===\n');

  const nftContract = process.env.CASPER_NFT_CONTRACT_ADDRESS;
  const tokenContract = process.env.CASPER_TOKEN_CONTRACT_ADDRESS;
  const daoContract = process.env.CASPER_DAO_CONTRACT_ADDRESS;
  const dexContract = process.env.CASPER_DEX_CONTRACT_ADDRESS;

  console.log('Configured contract addresses:');
  console.log(`  NFT:   ${nftContract || 'NOT SET'}`);
  console.log(`  TOKEN: ${tokenContract || 'NOT SET'}`);
  console.log(`  DAO:   ${daoContract || 'NOT SET'}`);
  console.log(`  DEX:   ${dexContract || 'NOT SET'}`);
  console.log('');

  if (!nftContract) {
    console.log('❌ CASPER_NFT_CONTRACT_ADDRESS not configured');
    return;
  }

  const client = new CasperClient(TESTNET_RPC);

  // Try to query the contract package
  console.log('Attempting to query NFT contract...\n');

  try {
    // Get state root hash
    const stateRootHash = await client.getStateRootHash();
    console.log(`State root hash: ${stateRootHash}`);

    // Try to get contract info
    // For package hash, we need to query the state
    const packageHash = nftContract.startsWith('contract-package-')
      ? nftContract.replace('contract-package-', '')
      : nftContract.replace('hash-', '');

    console.log(`\nQuerying package hash: ${packageHash}`);

    // Make raw RPC call to get state item
    const response = await fetch(TESTNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'state_get_item',
        params: {
          state_root_hash: stateRootHash,
          key: `hash-${packageHash}`,
          path: []
        },
        id: 1
      })
    });

    const data = await response.json();

    if (data.error) {
      console.log('\n❌ CONTRACT DOES NOT EXIST ON TESTNET!');
      console.log(`Error: ${JSON.stringify(data.error, null, 2)}`);
      console.log('\nThis explains the -32008 error!');
      console.log('The contract addresses in .env are probably from a different network or deployment.');
      console.log('\nYou need to either:');
      console.log('  1. Deploy contracts to testnet first');
      console.log('  2. Update .env with correct testnet contract addresses');
    } else {
      console.log('\n✅ CONTRACT EXISTS ON TESTNET!');
      console.log('Contract data:', JSON.stringify(data.result, null, 2));
    }

  } catch (error) {
    console.error('Query error:', error.message);
  }
}

verifyContractExists().catch(error => {
  console.error('FAILED:', error.message);
  process.exit(1);
});
