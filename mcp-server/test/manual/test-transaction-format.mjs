/**
 * Test Transaction format (2.0) instead of Deploy format (1.5)
 * Based on Discord chat logs suggesting testnet expects Transaction model
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import {
  loadPrivateKey,
  getSecretKeyFromEnv,
} from './dist/utils/signing.js';
import { CasperClient } from './dist/services/casper-client.js';
import casperSdk from 'casper-js-sdk';

const { NativeTransferBuilder, PublicKey } = casperSdk;

const TESTNET_RPC = 'https://node.testnet.casper.network/rpc';

async function testTransactionFormat() {
  console.log('=== TESTING TRANSACTION FORMAT (2.0) INSTEAD OF DEPLOY (1.5) ===\n');

  const secretKey = getSecretKeyFromEnv();
  if (!secretKey) {
    throw new Error('CASPER_SECRET_KEY not configured');
  }

  const privateKey = loadPrivateKey(secretKey);
  const publicKeyHex = privateKey.publicKey.toHex();
  const senderKey = PublicKey.fromHex(publicKeyHex);

  console.log(`From: ${publicKeyHex}`);
  console.log(`To: ${publicKeyHex} (sending to self)`);
  console.log(`Amount: 0.1 CSPR`);
  console.log(`RPC: ${TESTNET_RPC}\n`);

  const client = new CasperClient(TESTNET_RPC);

  console.log('=== Building Transaction with .build() (NOT .buildFor1_5()) ===');

  const builder = new NativeTransferBuilder();

  // CRITICAL CHANGE: Use .build() instead of .buildFor1_5()
  // This creates Transaction format instead of Deploy format
  const transaction = builder
    .from(senderKey)
    .target(senderKey)
    .amount('100000000')  // 0.1 CSPR
    .chainName('casper-test')
    .ttl(1800000)
    .payment(100000000)
    .build();  // <-- Transaction format (2.0)

  console.log('Transaction built (format 2.0)');
  console.log('transaction.getDeploy() returns:', transaction.getDeploy?.());

  // Sign the transaction
  transaction.sign(privateKey);
  console.log('Transaction signed\n');

  console.log('=== SUBMITTING TRANSACTION FORMAT ===');
  console.log('Expected: CasperClient will use putTransaction() instead of putDeploy()');

  let deployHash;
  try {
    deployHash = await client.submitTransaction(transaction);
    console.log(`\n✅ SUCCESS! Transaction format accepted!`);
    console.log(`Transaction Hash: ${deployHash}`);
    console.log(`Explorer: https://testnet.cspr.live/deploy/${deployHash}\n`);
    console.log(`\n🎉 BREAKTHROUGH! The issue was Deploy vs Transaction format!`);
    console.log(`Testnet expects Transaction (2.0) format, not Deploy (1.5) format!`);
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    console.log('\nFull error object:');
    console.log(JSON.stringify(error, null, 2));
    console.log(`\nIf Transaction format ALSO fails:`);
    console.log(`  → Check if testnet is actually on 2.0`);
    console.log(`  → Check RPC method requirements`);
    console.log(`  → Check Transaction structure requirements`);
    throw error;
  }

  // Wait and check status
  console.log('\nWaiting 5 seconds before checking status...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n=== CHECKING TRANSACTION STATUS ===');
  try {
    const deployInfo = await client.getDeploy(deployHash);

    if (deployInfo.execution_info) {
      const result = deployInfo.execution_info.execution_result;
      if (result.Success) {
        console.log('✅ TRANSACTION EXECUTED SUCCESSFULLY!');
        console.log(`Cost: ${(BigInt(result.Success.cost) / BigInt(1_000_000_000)).toString()} CSPR`);
      } else if (result.Failure) {
        console.log('❌ TRANSACTION FAILED ON-CHAIN');
        console.log(`Error: ${result.Failure.error_message}`);
      }
    } else {
      console.log('⏳ Transaction pending execution');
    }
  } catch (error) {
    console.log(`Status check failed: ${error.message}`);
  }
}

testTransactionFormat().catch(error => {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
});
