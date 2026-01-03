/**
 * Check execution status of NFT and DEX transactions
 * from test-nft-dex-sign-submit.mjs
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { CasperClient } from './dist/services/casper-client.js';

const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);

const transactions = [
  {
    name: 'NFT Mint (Sign/Submit Test)',
    hash: '072c30eec21b713d09617b195eb738a0bf44d7efbbbe07fbcb7798cd5e1b8183'
  },
  {
    name: 'DEX Create Pool (Sign/Submit Test)',
    hash: 'b6e8fc79b83adf8cd67e6511ad657ab2d78d897d3797c121364ccaac20f22be7'
  }
];

console.log('=== Checking NFT & DEX Sign/Submit Test Execution ===\n');

for (const tx of transactions) {
  console.log(`--- ${tx.name} ---`);
  console.log(`Hash: ${tx.hash}`);

  try {
    const result = await client.getTransaction(tx.hash);

    if (result?.execution_info?.execution_result?.Version2) {
      const execResult = result.execution_info.execution_result.Version2;

      if (execResult.error_message === null) {
        console.log('✅ EXECUTED SUCCESSFULLY');
        const cost = execResult.cost;
        const consumed = execResult.consumed;
        const refund = execResult.refund;
        console.log(`   Payment: ${(Number(cost) / 1_000_000_000).toFixed(2)} CSPR`);
        console.log(`   Gas Consumed: ${(Number(consumed) / 1_000_000_000).toFixed(4)} CSPR`);
        console.log(`   Gas Refund: ${(Number(refund) / 1_000_000_000).toFixed(4)} CSPR`);
        console.log(`   Block Height: ${result.execution_info.block_height}`);
      } else {
        console.log('❌ EXECUTION FAILED');
        console.log('   Error:', execResult.error_message);
        const cost = execResult.cost;
        const consumed = execResult.consumed;
        console.log(`   Payment: ${(Number(cost) / 1_000_000_000).toFixed(2)} CSPR`);
        console.log(`   Gas Consumed: ${(Number(consumed) / 1_000_000_000).toFixed(4)} CSPR`);
      }
    } else if (result?.execution_info) {
      console.log('⏳ EXECUTION INFO EXISTS BUT NO Version2 RESULT');
      console.log('   (Transaction may still be processing)');
    } else {
      console.log('⏳ PENDING (not executed yet)');
    }
  } catch (error) {
    console.log('⚠️  ERROR:', error.message);
  }

  console.log();
}

console.log('=== Verification Complete ===');
