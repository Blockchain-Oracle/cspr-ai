/**
 * Verify Transaction Execution
 *
 * Checks if transactions actually EXECUTED successfully (not just accepted)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { CasperClient } from './dist/services/casper-client.js';

const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);

// Transaction hashes from test-all-transaction-types.mjs output
const transactions = [
  { name: 'DAO: Create Proposal', hash: '61b9bfab8445e570d29bdf6097c3616594aa64696726dfc48d4772d7c6912902' },
  { name: 'DAO: Vote', hash: '46425c9e58ff5a6645e4b821e2c2130c3e6af947d30381c56ed43b1f9aaeead3' },
  { name: 'NFT: Mint', hash: 'ab3cc230676546a95a62d54c8ab95d00336bfc2cc6ebfaad53c0f27ab1808027' },
  { name: 'Token: Mint', hash: '419315e573a4d3df1834af3764c0e0cd4b343372ded8e6b54ef1ffb7ea8c87da' },
  { name: 'DEX: Create Pool', hash: 'ff62a5aaf23dd938ce073c7870ade256caef7033a66b649bf0929f3798cb0aaf' }
];

console.log('=== Verifying Transaction Execution ===\n');

for (const tx of transactions) {
  console.log(`--- ${tx.name} ---`);
  console.log(`Hash: ${tx.hash}`);

  try {
    const result = await client.getDeploy(tx.hash);

    if (result.execution_results && result.execution_results.length > 0) {
      const execution = result.execution_results[0].result;

      if (execution.Success) {
        console.log('✅ EXECUTED SUCCESSFULLY');
        console.log(`   Cost: ${(Number(execution.Success.cost) / 1_000_000_000).toFixed(2)} CSPR`);

        // Check for error in execution
        if (execution.Success.error_message) {
          console.log('❌ EXECUTION ERROR:', execution.Success.error_message);
        }
      } else if (execution.Failure) {
        console.log('❌ EXECUTION FAILED');
        console.log('   Error:', execution.Failure.error_message);
        console.log('   Cost:', (Number(execution.Failure.cost) / 1_000_000_000).toFixed(2), 'CSPR');
      }
    } else {
      console.log('⏳ PENDING (not executed yet)');
    }
  } catch (error) {
    console.log('⚠️  ERROR:', error.message);
  }

  console.log();
}

console.log('=== Verification Complete ===');
