/**
 * Test with alternative RPC endpoint
 * Using community-recommended endpoint: https://node.testnet.casper.network/rpc
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

const { ContractCallBuilder, PublicKey, Args, CLValue } = casperSdk;

// ALTERNATIVE RPC ENDPOINT (from community)
const TESTNET_RPC = 'https://node.testnet.casper.network/rpc';

async function testAlternativeRpc() {
  console.log('=== TESTING WITH ALTERNATIVE RPC ENDPOINT ===\n');

  // Load private key
  const secretKey = getSecretKeyFromEnv();
  if (!secretKey) {
    throw new Error('CASPER_SECRET_KEY not configured');
  }

  const privateKey = loadPrivateKey(secretKey);
  const publicKeyHex = privateKey.publicKey.toHex();
  const senderKey = PublicKey.fromHex(publicKeyHex);

  console.log(`Signer: ${publicKeyHex}`);
  console.log(`Network: Casper Testnet`);
  console.log(`RPC Endpoint: ${TESTNET_RPC}\n`);

  // Create client WITHOUT API key (alternative endpoint might not need it)
  const client = new CasperClient(TESTNET_RPC);

  // Get NFT contract address
  const nftContract = process.env.CASPER_NFT_CONTRACT_ADDRESS;
  if (!nftContract) {
    throw new Error('CASPER_NFT_CONTRACT_ADDRESS not set');
  }

  // Extract package hash (remove prefix)
  const packageHash = nftContract.startsWith('contract-package-')
    ? nftContract.replace('contract-package-', '')
    : nftContract.replace('hash-', '');

  console.log(`NFT Contract: ${nftContract}`);
  console.log(`Package Hash: ${packageHash}`);
  console.log('\n=== Building Deploy with SDK ===');

  // Build Deploy directly with SDK
  const builder = new ContractCallBuilder();
  const transaction = builder
    .byPackageHash(packageHash, undefined)
    .from(senderKey)
    .entryPoint('mint_with_auto_uri')
    .chainName('casper-test')
    .runtimeArgs(Args.fromMap({
      to: CLValue.newCLPublicKey(senderKey),
      name: CLValue.newCLString(`SDK Test ${Date.now()}`)
    }))
    .ttl(1800000)
    .payment(100000000)
    .buildFor1_5();

  console.log('Transaction built with SDK');

  // Sign the transaction
  transaction.sign(privateKey);
  console.log('Transaction signed\n');

  console.log('=== SUBMITTING TO ALTERNATIVE RPC ===');
  let deployHash;
  try {
    deployHash = await client.submitTransaction(transaction);
    console.log(`\n✅ SUCCESS! Deploy submitted to alternative RPC endpoint!`);
    console.log(`Deploy Hash: ${deployHash}`);
    console.log(`Explorer: https://testnet.cspr.live/deploy/${deployHash}\n`);
  } catch (error) {
    console.log(`\n❌ FAILED with alternative RPC: ${error.message}`);
    console.log(`\nThis means the problem is NOT the RPC endpoint.`);
    console.log(`Possible issues:`);
    console.log(`  - Contract package hash is invalid or doesn't exist`);
    console.log(`  - Contract entry point doesn't exist`);
    console.log(`  - Account doesn't have permission`);
    console.log(`  - Network mismatch (testnet vs mainnet)`);
    throw error;
  }

  // Wait a bit and check deploy status
  console.log('Waiting 5 seconds before checking status...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n=== CHECKING DEPLOY STATUS ===');
  try {
    const deployInfo = await client.getDeploy(deployHash);

    if (deployInfo.execution_info) {
      const result = deployInfo.execution_info.execution_result;
      if (result.Success) {
        console.log('✅ DEPLOY EXECUTED SUCCESSFULLY!');
        console.log(`Cost: ${(BigInt(result.Success.cost) / BigInt(1_000_000_000)).toString()} CSPR`);
        console.log(`Block Hash: ${result.Success.block_hash || 'pending'}`);
      } else if (result.Failure) {
        console.log('❌ DEPLOY FAILED ON-CHAIN');
        console.log(`Error: ${result.Failure.error_message}`);
      }
    } else {
      console.log('⏳ Deploy pending execution (not in a block yet)');
      console.log('Check explorer URL above in 2-3 minutes for final status');
    }
  } catch (error) {
    console.log(`Status check failed: ${error.message}`);
    console.log('Deploy may still be processing. Check explorer URL above.\n');
  }
}

testAlternativeRpc().catch(error => {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
});
