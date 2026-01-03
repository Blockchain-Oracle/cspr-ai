/**
 * REAL END-TO-END TEST
 * This actually submits to Casper testnet and verifies execution
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
} from './dist/utils/signing.js';
import { buildStoredContractDeploy } from './dist/utils/contracts.js';
import { CasperClient } from './dist/services/casper-client.js';
import casperSdk from 'casper-js-sdk';

const { Deploy } = casperSdk;

const TESTNET_RPC = 'https://node.testnet.cspr.cloud/rpc';

async function testRealSubmission() {
  console.log('=== REAL END-TO-END SUBMISSION TEST ===\n');

  // Load private key
  const secretKey = getSecretKeyFromEnv();
  if (!secretKey) {
    throw new Error('CASPER_SECRET_KEY not configured');
  }

  const privateKey = loadPrivateKey(secretKey);
  const publicKeyHex = privateKey.publicKey.toHex();

  console.log(`Signer: ${publicKeyHex}`);
  console.log(`Network: Casper Testnet\n`);

  // Create client with API key
  const apiKey = process.env.CSPR_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error('CSPR_CLOUD_API_KEY not configured');
  }
  const client = new CasperClient(TESTNET_RPC, apiKey);

  // Check balance first
  console.log('Checking account balance...');
  try {
    const { balance } = await client.getBalance(publicKeyHex);
    console.log(`Balance: ${balance} CSPR`);
    if (parseFloat(balance) < 5) {
      console.log('\n⚠️  WARNING: Low balance. You may need testnet tokens from faucet.');
      console.log('Faucet: https://testnet.cspr.live/tools/faucet\n');
    }
  } catch (error) {
    console.log(`Balance check failed: ${error.message}`);
    console.log('Account may not exist yet. Continuing anyway...\n');
  }

  // Build a simple NFT mint transaction
  const nftContract = process.env.CASPER_NFT_CONTRACT_ADDRESS;
  if (!nftContract) {
    throw new Error('CASPER_NFT_CONTRACT_ADDRESS not set');
  }

  console.log(`NFT Contract: ${nftContract}`);
  console.log('\nBuilding NFT mint transaction...');

  const unsignedDeploy = buildStoredContractDeploy(
    publicKeyHex,
    'casper-test',
    nftContract,
    'mint_with_auto_uri',
    [
      ['to', { cl_type: 'Key', parsed: publicKeyHex }],
      ['name', { cl_type: 'String', parsed: `E2E Test NFT ${Date.now()}` }]
    ]
  );

  console.log('Reconstructing transaction...');
  const transaction = reconstructTransaction(unsignedDeploy);

  console.log('Signing transaction...');
  const signedTransaction = signTransaction(transaction, privateKey);

  // Debug: Check what getDeploy() returns
  const deploy = signedTransaction.getDeploy();
  console.log('\n=== DEPLOY OBJECT DEBUG ===');
  console.log('Deploy exists?', deploy !== undefined);
  console.log('Deploy is instance of casperSdk.Deploy?', deploy instanceof Deploy);

  if (deploy?.session?.storedVersionedContractByHash) {
    const svch = deploy.session.storedVersionedContractByHash;
    console.log('StoredVersionedContractByHash hash (raw):', svch.hash);
    console.log('StoredVersionedContractByHash hash.hash:', svch.hash?.hash);
    console.log('StoredVersionedContractByHash hash.hashBytes:', svch.hash?.hash?.hashBytes);
    console.log('StoredVersionedContractByHash hash.originPrefix:', svch.hash?.originPrefix);
    console.log('StoredVersionedContractByHash version:', svch.version);
    console.log('StoredVersionedContractByHash entryPoint:', svch.entryPoint);

    // Check if hash needs to be formatted differently
    if (svch.hash?.hash?.hashBytes) {
      const hashHex = Array.from(svch.hash.hash.hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('StoredVersionedContractByHash hash as hex:', hashHex);
    }
  }

  // Try using SDK's static Deploy.toJSON
  console.log('\nSDK Deploy.toJSON function?', typeof Deploy.toJSON === 'function');
  if (typeof Deploy.toJSON === 'function' && deploy) {
    try {
      const deployJson = Deploy.toJSON(deploy);
      console.log('Deploy JSON session keys:', Object.keys(deployJson.session || {}));
      console.log('\nFull Deploy JSON:', JSON.stringify(deployJson, null, 2));
    } catch (e) {
      console.log('Error calling Deploy.toJSON:', e.message);
    }
  }

  console.log('\n=== SUBMITTING TO TESTNET ===');
  let deployHash;
  try {
    deployHash = await client.submitTransaction(signedTransaction);
    console.log(`✅ SUBMITTED SUCCESSFULLY!`);
    console.log(`Deploy Hash: ${deployHash}`);
    console.log(`Explorer: https://testnet.cspr.live/deploy/${deployHash}\n`);
  } catch (error) {
    console.log(`❌ SUBMISSION FAILED: ${error.message}`);
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

  console.log('\n=== SUMMARY ===');
  console.log('1. ✅ Build transaction - WORKS');
  console.log('2. ✅ Sign transaction - WORKS');
  console.log('3. ✅ Submit to network - WORKS');
  console.log('4. ⏳ Execution status - Check explorer URL above');
  console.log('\nIf deploy shows as pending, wait 2-3 minutes and check the explorer link.');
}

testRealSubmission().catch(error => {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
});
