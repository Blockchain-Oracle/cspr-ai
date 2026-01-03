/**
 * Test native CSPR transfer
 * This doesn't depend on any contract - just basic blockchain functionality
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

import {
  loadPrivateKey,
  getSecretKeyFromEnv,
} from './dist/utils/signing.js';
import { CasperClient } from './dist/services/casper-client.js';
import casperSdk from 'casper-js-sdk';

const { NativeTransferBuilder, PublicKey } = casperSdk;

// Use alternative RPC endpoint
const TESTNET_RPC = 'https://node.testnet.casper.network/rpc';

async function testNativeTransfer() {
  console.log('=== NATIVE CSPR TRANSFER TEST ===\n');

  // Load private key
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

  // Create client
  const client = new CasperClient(TESTNET_RPC);

  console.log('=== Building Native Transfer with SDK ===');

  // Build a simple transfer (to self, just to test)
  const builder = new NativeTransferBuilder();
  const transaction = builder
    .from(senderKey)
    .target(senderKey)  // Send to self
    .amount('100000000')  // 0.1 CSPR in motes
    .chainName('casper-test')
    .ttl(1800000)
    .payment(100000000)
    .buildFor1_5();

  console.log('Transfer built with SDK');

  // Sign the transaction
  transaction.sign(privateKey);
  console.log('Transfer signed\n');

  console.log('=== SUBMITTING NATIVE TRANSFER ===');
  let deployHash;
  try {
    deployHash = await client.submitTransaction(transaction);
    console.log(`\n✅ SUCCESS! Native transfer submitted!`);
    console.log(`Deploy Hash: ${deployHash}`);
    console.log(`Explorer: https://testnet.cspr.live/deploy/${deployHash}\n`);
    console.log(`\n🎉 BREAKTHROUGH! Our Deploy structure is VALID!`);
    console.log(`The -32008 error was caused by the CONTRACT not existing.`);
  } catch (error) {
    console.log(`\n❌ FAILED: ${error.message}`);
    console.log(`\nIf this ALSO fails with -32008:`);
    console.log(`  → Deploy structure issue (timestamps, gas, chain name, etc.)`);
    console.log(`  → Account issue (insufficient balance, locked, etc.)`);
    throw error;
  }

  // Wait and check status
  console.log('Waiting 5 seconds before checking status...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n=== CHECKING TRANSFER STATUS ===');
  try {
    const deployInfo = await client.getDeploy(deployHash);

    if (deployInfo.execution_info) {
      const result = deployInfo.execution_info.execution_result;
      if (result.Success) {
        console.log('✅ TRANSFER EXECUTED SUCCESSFULLY!');
        console.log(`Cost: ${(BigInt(result.Success.cost) / BigInt(1_000_000_000)).toString()} CSPR`);
      } else if (result.Failure) {
        console.log('❌ TRANSFER FAILED ON-CHAIN');
        console.log(`Error: ${result.Failure.error_message}`);
      }
    } else {
      console.log('⏳ Transfer pending execution');
    }
  } catch (error) {
    console.log(`Status check failed: ${error.message}`);
  }
}

testNativeTransfer().catch(error => {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
});
