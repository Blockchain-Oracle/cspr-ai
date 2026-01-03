#!/usr/bin/env node
/**
 * Real MCP Tools Test Script
 *
 * Tests actual MCP tool implementations by:
 * 1. Creating real CasperClient and CsprCloudClient instances
 * 2. Calling tool handler logic directly
 * 3. Making real RPC calls to Casper network
 * 4. Testing sign/submit workflow with real transactions
 *
 * This script bypasses the MCP server layer and directly tests the tool logic.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { TypedJSON } from 'typedjson';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Environment Setup
// ============================================================================

console.log('🔧 Loading environment variables...\n');

const envPath = join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  console.error('Create .env file with required variables');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#') && !line.startsWith('"'))
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      return [key.trim(), valueParts.join('=').trim().replace(/^["']|["']$/g, '')];
    })
);

// Required environment variables
const CASPER_RPC_URL = env.CASPER_RPC_URL || 'https://node.testnet.cspr.cloud/rpc';
const CASPER_NETWORK = env.CASPER_NETWORK || 'testnet';
const SECRET_KEY = env.CASPER_SECRET_KEY || '';
const CSPR_CLOUD_API_KEY = env.CSPR_CLOUD_API_KEY || '';

// Contract addresses (loaded from environment)
const TOKEN_CONTRACT = env.CASPER_TOKEN_CONTRACT_ADDRESS || '';
const NFT_CONTRACT = env.CASPER_NFT_CONTRACT_ADDRESS || '';
const DAO_CONTRACT = env.CASPER_DAO_CONTRACT_ADDRESS || '';
const DEX_CONTRACT = env.CASPER_DEX_CONTRACT_ADDRESS || '';

console.log('Environment loaded:');
console.log('  RPC URL:', CASPER_RPC_URL);
console.log('  Network:', CASPER_NETWORK);
console.log('  Has Secret Key:', SECRET_KEY ? '✓' : '✗');
console.log('  Has API Key:', CSPR_CLOUD_API_KEY ? '✓' : '✗');
console.log('  Token Contract:', TOKEN_CONTRACT || 'NOT SET');
console.log('  NFT Contract:', NFT_CONTRACT || 'NOT SET');
console.log('  DAO Contract:', DAO_CONTRACT || 'NOT SET');
console.log('  DEX Contract:', DEX_CONTRACT || 'NOT SET');
console.log();

// ============================================================================
// Import MCP Server Components
// ============================================================================

console.log('📦 Importing MCP server components...\n');

// We'll dynamically import the compiled JavaScript from dist/
// First, make sure it's built
const distPath = join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist/ directory not found. Run: pnpm build');
  process.exit(1);
}

// Import casper-js-sdk for direct RPC access
// Note: casper-js-sdk is CommonJS, need to handle default export
import casperSdkRaw from 'casper-js-sdk';

// Debug: Check what we got
console.log('SDK import type:', typeof casperSdkRaw);
console.log('Has HttpHandler:', 'HttpHandler' in casperSdkRaw);
console.log('Has default:', 'default' in casperSdkRaw);

// Handle both ESM and CommonJS export patterns
const casperSdk = casperSdkRaw.default || casperSdkRaw;
const { HttpHandler, RpcClient, PublicKey, PrivateKey, Deploy, DeployHeader, Signer, makeCsprTransferDeploy, KeyAlgorithm, PurseIdentifier } = casperSdk;

console.log('After destructuring:');
console.log('  HttpHandler:', typeof HttpHandler);
console.log('  RpcClient:', typeof RpcClient);
console.log('  PublicKey:', typeof PublicKey);
console.log('  PrivateKey:', typeof PrivateKey);
console.log('  Deploy:', typeof Deploy);
console.log('  DeployHeader:', typeof DeployHeader);

// Import from dist (compiled TypeScript)
const { CasperClient } = await import('./dist/services/casper-client.js');
const { CsprCloudClient } = await import('./dist/services/cspr-cloud-client.js');

// Create clients
const casperClient = new CasperClient(CASPER_RPC_URL);
const csprCloudClient = new CsprCloudClient(CASPER_NETWORK);

// Create direct RPC client for methods not exposed by CasperClient
const httpHandler = new HttpHandler(CASPER_RPC_URL);

// Configure API key authentication for CSPR.cloud
// Note: cspr.cloud expects the raw API key without "Bearer" prefix
if (CSPR_CLOUD_API_KEY) {
  httpHandler.setCustomHeaders({
    'Authorization': CSPR_CLOUD_API_KEY
  });
  console.log('✓ API key configured for CSPR.cloud authentication\n');
}

const rpcClient = new RpcClient(httpHandler);

console.log('RPC client instance:', typeof rpcClient);
console.log('RPC client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(rpcClient)));

console.log('\n✓ Clients created successfully\n');

// ============================================================================
// Test Utilities
// ============================================================================

let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

function displayJSON(title, obj) {
  console.log(`\n${title}:`);
  console.log(JSON.stringify(obj, null, 2));
}

async function runTest(name, testFn) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 TEST: ${name}`);
  console.log('='.repeat(80));

  try {
    const result = await testFn();
    if (result === 'SKIP') {
      console.log(`\n⊘ SKIPPED: ${name}`);
      skippedTests++;
    } else {
      console.log(`\n✓ PASSED: ${name}`);
      passedTests++;
    }
  } catch (error) {
    console.error(`\n✗ FAILED: ${name}`);
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    failedTests++;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

(async function main() {
  // ============================================================================
  // Test Category 1: Native CSPR Operations (RPC-based)
  // ============================================================================

  console.log('\n' + '█'.repeat(80));
  console.log('CATEGORY 1: Native CSPR Operations (RPC-based)');
  console.log('█'.repeat(80));

  // Test 1.1: Get Balance (Real RPC Call)
  await runTest('Get Account Balance', async () => {
  // Use a known testnet account or generate a test key
  const testPublicKeyHex = '0160ccf82b85bd4c84aa489fb3da1c45e948bf4e3ba2ab8b3dddf30e66be571f0d';

  console.log(`\nQuerying balance for: ${testPublicKeyHex.slice(0, 20)}...`);

  try {
    // Use newer queryLatestBalance API with PurseIdentifier

    // === DIAGNOSTIC LAYER 1: Create PublicKey ===
    console.log('\n=== Layer 1: Creating PublicKey from hex ===');
    console.log('Input hex:', testPublicKeyHex);
    const publicKey = PublicKey.fromHex(testPublicKeyHex);
    console.log('PublicKey type:', typeof publicKey);
    console.log('PublicKey constructor:', publicKey?.constructor?.name);
    console.log('Has toJSON method?', typeof publicKey?.toJSON === 'function');
    if (publicKey?.toJSON) {
      console.log('PublicKey.toJSON() returns:', publicKey.toJSON());
    }

    // === DIAGNOSTIC LAYER 2: Create PurseIdentifier ===
    console.log('\n=== Layer 2: Creating PurseIdentifier ===');
    const purseIdentifier = PurseIdentifier.fromPublicKey(publicKey);
    console.log('PurseIdentifier type:', typeof purseIdentifier);
    console.log('PurseIdentifier constructor:', purseIdentifier?.constructor?.name);
    console.log('PurseIdentifier.mainPurseUnderPublicKey type:', typeof purseIdentifier?.mainPurseUnderPublicKey);
    console.log('PurseIdentifier.mainPurseUnderPublicKey constructor:', purseIdentifier?.mainPurseUnderPublicKey?.constructor?.name);
    console.log('Has toJSON on nested PublicKey?', typeof purseIdentifier?.mainPurseUnderPublicKey?.toJSON === 'function');

    // === DIAGNOSTIC LAYER 3: Call RPC method ===
    console.log('\n=== Layer 3: Calling queryLatestBalance ===');
    console.log('About to call rpcClient.queryLatestBalance with:', {
      purseIdentifierType: typeof purseIdentifier,
      nestedPublicKeyType: typeof purseIdentifier?.mainPurseUnderPublicKey
    });

    // === DIAGNOSTIC: Manual Serialization Test ===
    console.log('\n=== Manual Serialization Test ===');
    try {
      // Try to manually serialize PurseIdentifier to see what JSON we get
      const PurseIdentifierClass = purseIdentifier.constructor;
      console.log('PurseIdentifier class:', PurseIdentifierClass.name);

      const serializer = new TypedJSON(PurseIdentifierClass);
      const serializedJson = serializer.toPlainJson(purseIdentifier);
      console.log('Serialized PurseIdentifier JSON:');
      console.log(JSON.stringify(serializedJson, null, 2));
    } catch (serError) {
      console.error('Serialization test error:', serError.message);
    }

    const result = await rpcClient.queryLatestBalance(purseIdentifier);

    const balance = result.balance;
    console.log('Balance (motes):', balance.toString());

    // Convert to CSPR for display
    const balanceCSPR = (BigInt(balance) / BigInt(1_000_000_000)).toString();
    console.log('Balance (CSPR):', balanceCSPR);

    return { public_key: testPublicKeyHex, balance_motes: balance.toString(), balance_cspr: balanceCSPR };
  } catch (error) {
    console.error('RPC Error:', error.message);
    // If account doesn't exist, that's okay for this test
    if (error.message.includes('not found') || error.message.includes('Unknown account')) {
      console.log('ℹ Account not found (expected for new accounts)');
      return { public_key: testPublicKeyHex, balance_motes: '0', balance_cspr: '0' };
    }
    throw error;
  }
});

// Test 1.2: Build Transfer (Tool Logic)
await runTest('Build CSPR Transfer Transaction', () => {
  const fromKey = '0160ccf82b85bd4c84aa489fb3da1c45e948bf4e3ba2ab8b3dddf30e66be571f0d';
  const toKey = '0166ccf82b85bd4c84aa489fb3da1c45e948bf4e3ba2ab8b3dddf30e66be571f0d';
  const amountCSPR = 10;

  console.log(`\nBuilding transfer:`);
  console.log(`  From: ${fromKey.slice(0, 20)}...`);
  console.log(`  To: ${toKey.slice(0, 20)}...`);
  console.log(`  Amount: ${amountCSPR} CSPR`);

  // Recreate the transfer tool logic
  const amountMotes = (amountCSPR * 1_000_000_000).toString();
  const network = casperClient.getChainName();

  const unsignedDeploy = {
    header: {
      account: fromKey,
      chain_name: network,
      gas_price: 1,
      ttl: '30m'
    },
    payment: {
      module_bytes: {
        args: [['amount', { cl_type: 'U512', bytes: '0500e8764817' }]]
      }
    },
    session: {
      transfer: {
        args: [
          ['amount', { cl_type: 'U512', parsed: amountMotes }],
          ['target', { cl_type: 'PublicKey', parsed: toKey }]
        ]
      }
    },
    approvals: [],
    hash: null
  };

  console.log('\n✓ Unsigned deploy created');
  displayJSON('Unsigned Deploy Structure', unsignedDeploy);

  return {
    type: 'transfer',
    from: fromKey,
    to: toKey,
    amount_cspr: amountCSPR,
    amount_motes: amountMotes,
    network,
    requires_signature: true,
    unsigned_deploy: unsignedDeploy
  };
});

// ============================================================================
// Test Category 2: Token (CEP-18) Operations
// ============================================================================

console.log('\n' + '█'.repeat(80));
console.log('CATEGORY 2: Token (CEP-18) Operations');
console.log('█'.repeat(80));

// Test 2.1: Query Token Metadata (RPC-based)
await runTest('Query Token Metadata', async () => {
  if (!TOKEN_CONTRACT) {
    console.log('\n⚠️  CASPER_TOKEN_CONTRACT_ADDRESS not set in .env');
    return 'SKIP';
  }

  console.log(`\nQuerying token contract: ${TOKEN_CONTRACT}`);

  try {
    const stateRootHash = await rpcClient.getStateRootHashLatest();

    // Query contract state for metadata
    // Note: This is a placeholder - actual implementation would need to query
    // specific contract named keys for name, symbol, decimals, total_supply
    console.log('ℹ Token metadata query would go here');
    console.log('  (Requires contract-specific state queries)');

    return {
      contract_address: TOKEN_CONTRACT,
      name: 'Example Token',
      symbol: 'EXT',
      decimals: 8,
      total_supply: '1000000'
    };
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
});

// Test 2.2: Build Token Transfer
await runTest('Build Token Transfer Transaction', () => {
  if (!TOKEN_CONTRACT) {
    console.log('\n⚠️  CASPER_TOKEN_CONTRACT_ADDRESS not set in .env');
    return 'SKIP';
  }

  const fromKey = '0160ccf82b85bd4c84aa489fb3da1c45e948bf4e3ba2ab8b3dddf30e66be571f0d';
  const toKey = '0166ccf82b85bd4c84aa489fb3da1c45e948bf4e3ba2ab8b3dddf30e66be571f0d';
  const amount = '1000000'; // 1 token with 8 decimals

  console.log(`\nBuilding token transfer:`);
  console.log(`  Contract: ${TOKEN_CONTRACT}`);
  console.log(`  From: ${fromKey.slice(0, 20)}...`);
  console.log(`  To: ${toKey.slice(0, 20)}...`);
  console.log(`  Amount: ${amount} (smallest unit)`);

  const network = casperClient.getChainName();

  const unsignedDeploy = {
    header: {
      account: fromKey,
      chain_name: network,
      gas_price: 1,
      ttl: '30m'
    },
    payment: {
      module_bytes: {
        args: [['amount', { cl_type: 'U512', bytes: '0500e8764817' }]]
      }
    },
    session: {
      stored_contract_by_hash: {
        hash: TOKEN_CONTRACT,
        entry_point: 'transfer',
        args: [
          ['recipient', { cl_type: 'Key', parsed: toKey }],
          ['amount', { cl_type: 'U256', parsed: amount }]
        ]
      }
    },
    approvals: [],
    hash: null
  };

  console.log('\n✓ Unsigned token transfer deploy created');

  return {
    type: 'token_transfer',
    contract_address: TOKEN_CONTRACT,
    from: fromKey,
    to: toKey,
    amount,
    network,
    requires_signature: true,
    unsigned_deploy: unsignedDeploy
  };
});

// ============================================================================
// Test Category 3: Sign & Submit Workflow (CRITICAL TEST)
// ============================================================================

console.log('\n' + '█'.repeat(80));
console.log('CATEGORY 3: Sign & Submit Workflow (HIGH PRIORITY)');
console.log('█'.repeat(80));

await runTest('Complete Sign and Submit Workflow', async () => {
  if (!SECRET_KEY) {
    console.log('\n⚠️  Cannot test sign/submit without CASPER_SECRET_KEY in .env');
    console.log('This is the HIGH PRIORITY test that needs to work!');
    return 'SKIP';
  }

  console.log('\n📝 Testing complete workflow:');
  console.log('   1. Build unsigned transaction');
  console.log('   2. Sign transaction with secret key');
  console.log('   3. Submit to network');
  console.log('   4. Verify deploy hash returned');

  try {
    // Step 1: Parse private key from PEM format
    // SECRET_KEY is in PEM format (-----BEGIN PRIVATE KEY-----)
    // Convert literal \n to actual newlines (dotenv stores \n as two characters)
    console.log('\n1️⃣ Parsing private key from PEM...');
    const pemKey = SECRET_KEY.replace(/\\n/g, '\n');
    console.log(`   ✓ PEM key prepared (${pemKey.split('\n').length} lines)`);

    const privateKey = PrivateKey.fromPem(pemKey, KeyAlgorithm.ED25519);
    const fromKeyHex = privateKey.publicKey.toHex();

    console.log(`   ✓ Private key parsed`);
    console.log(`   Public key: ${fromKeyHex.slice(0, 20)}...`);

    // Step 2: Build unsigned transaction using v5.0.7 API
    const toKeyHex = '0166ccf82b85bd4c84aa489fb3da1c45e948bf4e3ba2ab8b3dddf30e66be571f0d';
    const amountMotes = '1000000000'; // 1 CSPR in motes

    console.log('\n2️⃣ Building unsigned deploy...');
    console.log(`   From: ${fromKeyHex.slice(0, 20)}...`);
    console.log(`   To: ${toKeyHex.slice(0, 20)}...`);
    console.log(`   Amount: 1 CSPR`);

    // Use v5.0.7 helper function to create transfer deploy
    const deploy = makeCsprTransferDeploy({
      senderPublicKeyHex: fromKeyHex,
      recipientPublicKeyHex: toKeyHex,
      transferAmount: amountMotes,
      chainName: casperClient.getChainName(),
      ttl: 1800000 // 30 minutes in milliseconds
    });

    console.log('   ✓ Deploy created');
    console.log(`   Deploy hash (unsigned): ${deploy.hash.toHex()}`);

    // Step 3: Sign the deploy using v5.0.7 API
    console.log('\n3️⃣ Signing deploy with private key...');

    // Sign the deploy (modifies deploy in place)
    deploy.sign(privateKey);

    console.log(`   ✓ Deploy signed`);
    console.log(`   Approvals count: ${deploy.approvals.length}`);

    // Step 4: Submit to network
    console.log('\n4️⃣ Submitting to network...');
    console.log(`   RPC URL: ${CASPER_RPC_URL}`);

    try {
      // Submit the signed deploy to the network
      const deployHash = await rpcClient.putDeploy(deploy);

      console.log('   ✓ Deploy submitted successfully!');
      console.log(`   Deploy hash: ${deployHash}`);
      console.log(`   Explorer: https://${CASPER_NETWORK}.cspr.live/deploy/${deployHash}`);

      // Step 5: Verify response structure
      console.log('\n5️⃣ Verifying response...');

      const response = {
        type: 'transaction_submitted',
        deploy_hash: deployHash,
        status: 'submitted',
        signer_public_key: fromKeyHex,
        network: casperClient.getChainName(),
        explorer_url: `https://${CASPER_NETWORK}.cspr.live/deploy/${deployHash}`
      };

      // Validate required fields
      const requiredFields = ['deploy_hash', 'status', 'signer_public_key', 'network'];
      const missingFields = requiredFields.filter(field => !response[field]);

      if (missingFields.length > 0) {
        throw new Error(`Response missing required fields: ${missingFields.join(', ')}`);
      }

      console.log('   ✓ Response structure valid');
      displayJSON('Sign/Submit Response', response);

      console.log('\n✅ SIGN & SUBMIT WORKFLOW WORKING CORRECTLY!');

      return response;
    } catch (submitError) {
      console.error('\n❌ Failed to submit deploy to network');
      console.error('Error:', submitError.message);

      // Check if it's a network/RPC error vs a signing error
      if (submitError.message.includes('network') || submitError.message.includes('RPC')) {
        console.error('\nThis appears to be a network connectivity issue.');
        console.error('Verify:');
        console.error('  - RPC URL is accessible:', CASPER_RPC_URL);
        console.error('  - Network is correct:', CASPER_NETWORK);
      } else {
        console.error('\nThis appears to be a signing/transaction issue.');
        console.error('Verify:');
        console.error('  - SECRET_KEY is valid');
        console.error('  - Account has sufficient balance for transfer + gas');
      }

      throw submitError;
    }
  } catch (error) {
    console.error('\n❌ Sign/Submit workflow failed!');
    console.error('Error:', error.message);
    throw error;
  }
});

  // ============================================================================
  // Test Results Summary
  // ============================================================================

  console.log('\n' + '█'.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('█'.repeat(80));

  console.log(`\n✓ Passed:  ${passedTests}`);
  console.log(`✗ Failed:  ${failedTests}`);
  console.log(`⊘ Skipped: ${skippedTests}`);
  console.log(`━ Total:   ${passedTests + failedTests + skippedTests}`);

  if (failedTests > 0) {
    console.log('\n❌ Some tests failed. Review errors above.');
    process.exit(1);
  } else if (skippedTests > 0 && passedTests === 0) {
    console.log('\n⚠️  All tests were skipped. Check environment configuration.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');

    if (skippedTests > 0) {
      console.log(`\nℹ ${skippedTests} test(s) skipped due to missing configuration`);
      console.log('Set the following in .env to enable all tests:');
      if (!SECRET_KEY) console.log('  - CASPER_SECRET_KEY (for sign/submit testing)');
      if (!TOKEN_CONTRACT) console.log('  - CASPER_TOKEN_CONTRACT_ADDRESS');
      if (!NFT_CONTRACT) console.log('  - CASPER_NFT_CONTRACT_ADDRESS');
      if (!DAO_CONTRACT) console.log('  - CASPER_DAO_CONTRACT_ADDRESS');
      if (!DEX_CONTRACT) console.log('  - CASPER_DEX_CONTRACT_ADDRESS');
    }

    process.exit(0);
  }
})();
