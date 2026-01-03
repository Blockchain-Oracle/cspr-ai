/**
 * Verify Latest Transaction Execution
 *
 * Checks if the latest test transactions EXECUTED successfully (not just accepted)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { CasperClient } from './dist/services/casper-client.js';

const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);

// Latest transaction hashes from test-all-transaction-types.mjs
const transactions = [
  { name: 'DAO: Create Proposal', hash: '532e50cb11aec5c6f7d4d67588a212b90777e20abeb21a5f76e85f1fb89f4711' },
  { name: 'DAO: Vote', hash: '60d955646189447044993c8ab2cbde62a04ac049b03f394d4574b898fe36a0f2' },
  { name: 'NFT: Mint', hash: '5bd655a12aba3112d35acc809c0f36d8f03b6f0ed661557a92a1ec5a291c4927' },
  { name: 'Token: Mint', hash: '228ee8b358db87d0438339551dfe638f7b559011ee6f69b7e37710c1c8cf7726' },
  { name: 'DEX: Create Pool', hash: 'e20378ac6e3cbc8d4d6153d27a75b040abf48c9174bc26eb4ce08711c70338c8' }
];

console.log('=== Verifying Latest Transaction Execution ===\n');

for (const tx of transactions) {
  console.log(`--- ${tx.name} ---`);
  console.log(`Hash: ${tx.hash}`);

  try {
    // Use getTransaction for Casper 2.0 Transaction V1 format
    const result = await client.getTransaction(tx.hash);

    // Transaction V1 execution result structure (Casper 2.0)
    // Execution info is at result.execution_info (not result.transaction.execution_info)
    if (result?.execution_info?.execution_result?.Version2) {
      const execResult = result.execution_info.execution_result.Version2;

      // Check for error_message field - null means success
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
