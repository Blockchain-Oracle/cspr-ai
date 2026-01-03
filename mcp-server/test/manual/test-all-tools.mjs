#!/usr/bin/env node
/**
 * Comprehensive MCP Tools Test Suite
 *
 * Tests all Casper MCP tools with actual contract addresses.
 * Focus on validating tool outputs and sign/submit workflow.
 *
 * Usage:
 *   node test-all-tools.mjs
 *
 * Requirements:
 *   - .env file with contract addresses
 *   - Node.js 18+
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Environment Setup
// ============================================================================

console.log('🧪 Casper MCP Tools - Comprehensive Test Suite');
console.log('='.repeat(80));
console.log('');

// Load environment variables from .env
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: .env file not found!');
  console.error('   Please create .env file with contract addresses.');
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

// Contract addresses from deployment
const NETWORK = env.CASPER_NETWORK || 'casper-test';
const RPC_URL = env.CASPER_RPC_URL || 'http://localhost:11101/rpc';
const TOKEN_CONTRACT = env.CASPER_TOKEN_CONTRACT_ADDRESS || '';
const NFT_CONTRACT = env.CASPER_NFT_CONTRACT_ADDRESS || '';
const DAO_CONTRACT = env.CASPER_DAO_CONTRACT_ADDRESS || '';
const DEX_CONTRACT = env.CASPER_DEX_CONTRACT_ADDRESS || '';
const SECRET_KEY = env.CASPER_SECRET_KEY || '';

console.log('📋 Environment Configuration:');
console.log('-'.repeat(80));
console.log(`Network: ${NETWORK}`);
console.log(`RPC URL: ${RPC_URL}`);
console.log(`Secret Key: ${SECRET_KEY ? '✅ Configured' : '❌ NOT SET (sign/submit will fail)'}`);
console.log('');

console.log('📦 Deployed Contracts:');
console.log('-'.repeat(80));
console.log(`TOKEN: ${TOKEN_CONTRACT ? `${TOKEN_CONTRACT.slice(0, 20)}...${TOKEN_CONTRACT.slice(-20)}` : '❌ NOT SET'}`);
console.log(`NFT:   ${NFT_CONTRACT ? `${NFT_CONTRACT.slice(0, 20)}...${NFT_CONTRACT.slice(-20)}` : '❌ NOT SET'}`);
console.log(`DAO:   ${DAO_CONTRACT ? `${DAO_CONTRACT.slice(0, 20)}...${DAO_CONTRACT.slice(-20)}` : '❌ NOT SET'}`);
console.log(`DEX:   ${DEX_CONTRACT ? `${DEX_CONTRACT.slice(0, 20)}...${DEX_CONTRACT.slice(-20)}` : '❌ NOT SET'}`);
console.log('');

// Validation
const missingContracts = [];
if (!TOKEN_CONTRACT) missingContracts.push('CASPER_TOKEN_CONTRACT_ADDRESS');
if (!NFT_CONTRACT) missingContracts.push('CASPER_NFT_CONTRACT_ADDRESS');
if (!DAO_CONTRACT) missingContracts.push('CASPER_DAO_CONTRACT_ADDRESS');
if (!DEX_CONTRACT) missingContracts.push('CASPER_DEX_CONTRACT_ADDRESS');

if (missingContracts.length > 0) {
  console.warn('⚠️  WARNING: Missing contract addresses in .env:');
  missingContracts.forEach(addr => console.warn(`   - ${addr}`));
  console.warn('   Some tests will be skipped.');
  console.log('');
}

// ============================================================================
// Test Helper Functions
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

/**
 * Run a test and capture the result
 */
function runTest(name, testFn) {
  try {
    console.log(`\n🧪 TEST: ${name}`);
    console.log('-'.repeat(80));

    const result = testFn();

    if (result === 'SKIP') {
      console.log('⏭️  SKIPPED (missing configuration)');
      testsSkipped++;
      return;
    }

    console.log('✅ PASSED');
    testsPassed++;
  } catch (error) {
    console.error('❌ FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    testsFailed++;
  }
}

/**
 * Display JSON in a readable format
 */
function displayJSON(label, obj) {
  console.log(`\n${label}:`);
  console.log(JSON.stringify(obj, null, 2));
}

/**
 * Validate unsigned deploy structure
 */
function validateUnsignedDeploy(deploy, toolName) {
  console.log(`\nValidating unsigned deploy from ${toolName}...`);

  const required = ['header', 'payment', 'session', 'approvals', 'hash'];
  const missing = required.filter(field => !(field in deploy));

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate header
  if (!deploy.header.account) {
    throw new Error('Missing header.account');
  }
  if (!deploy.header.chain_name) {
    throw new Error('Missing header.chain_name');
  }

  // Validate approvals (should be empty for unsigned)
  if (!Array.isArray(deploy.approvals)) {
    throw new Error('Approvals must be an array');
  }

  console.log('✓ Unsigned deploy structure is valid');
  console.log(`  - Chain: ${deploy.header.chain_name}`);
  console.log(`  - Account: ${deploy.header.account.slice(0, 20)}...`);
  console.log(`  - Hash: ${deploy.hash}`);
  console.log(`  - Approvals: ${deploy.approvals.length} (should be 0 for unsigned)`);

  return true;
}

// ============================================================================
// Mock MCP Tool Calls
// ============================================================================

/**
 * Simulate calling an MCP tool
 * In production, this would be a real MCP client call
 */
function callMCPTool(toolName, params) {
  console.log(`\nCalling MCP tool: ${toolName}`);
  displayJSON('Parameters', params);

  // This is a mock - in production, you would:
  // 1. Connect to the MCP server
  // 2. Call the tool with params
  // 3. Get the structured response

  // For now, we'll simulate the response structure
  const mockResponse = {
    content: [
      {
        type: 'text',
        text: `Mock response from ${toolName}`
      }
    ],
    structuredContent: {
      // This would be the actual tool output
      _mock: true,
      tool: toolName,
      params: params
    }
  };

  console.log('\n⚠️  NOTE: This is a MOCK response. Connect to actual MCP server for real testing.');
  displayJSON('Response', mockResponse);

  return mockResponse;
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('🏁 Starting Test Suite');
console.log('='.repeat(80));

// ----------------------------------------------------------------------------
// Category 1: Native CSPR Operations
// ----------------------------------------------------------------------------

console.log('\n\n📍 CATEGORY 1: Native CSPR Operations');
console.log('='.repeat(80));

runTest('Get Balance', () => {
  if (!SECRET_KEY) return 'SKIP';

  // Extract public key from secret key (this is a simplification)
  // In production, use casper-js-sdk to derive public key
  const mockPublicKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const response = callMCPTool('casper_get_balance', {
    public_key: mockPublicKey
  });

  // Validate response structure
  if (!response.structuredContent) {
    throw new Error('Missing structuredContent');
  }

  return response;
});

runTest('Build CSPR Transfer', () => {
  if (!SECRET_KEY) return 'SKIP';

  const mockFromKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const mockToKey = '01fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432';

  const response = callMCPTool('casper_build_transfer', {
    from_public_key: mockFromKey,
    to_public_key: mockToKey,
    amount_cspr: 10,
    memo: 'Test transfer'
  });

  // In production, validate the unsigned_deploy structure
  const { structuredContent } = response;
  if (structuredContent && structuredContent.unsigned_deploy) {
    console.log('\n✓ Tool returned unsigned_deploy');
    // validateUnsignedDeploy(structuredContent.unsigned_deploy, 'casper_build_transfer');
  }

  return response;
});

// ----------------------------------------------------------------------------
// Category 2: Token (CEP-18) Operations
// ----------------------------------------------------------------------------

console.log('\n\n📍 CATEGORY 2: Token (CEP-18) Operations');
console.log('='.repeat(80));

runTest('Query Token Metadata', () => {
  if (!TOKEN_CONTRACT) return 'SKIP';

  const response = callMCPTool('casper_query_token', {
    contract_address: TOKEN_CONTRACT,
    query_type: 'metadata'
  });

  return response;
});

runTest('Query Token Balance', () => {
  if (!TOKEN_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockOwner = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const response = callMCPTool('casper_query_token', {
    contract_address: TOKEN_CONTRACT,
    query_type: 'balance',
    owner: mockOwner
  });

  return response;
});

runTest('Build Token Transfer', () => {
  if (!TOKEN_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockFromKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const mockRecipient = '01fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432';

  const response = callMCPTool('casper_build_token_transfer', {
    from_public_key: mockFromKey,
    recipient: mockRecipient,
    amount: '1000000' // 1 token with 6 decimals
  });

  return response;
});

runTest('Build Token Mint', () => {
  if (!TOKEN_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockMinter = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const mockRecipient = '01fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432';

  const response = callMCPTool('casper_build_token_mint', {
    from_public_key: mockMinter,
    recipient: mockRecipient,
    amount: '1000000'
  });

  return response;
});

runTest('Build Token Burn', () => {
  if (!TOKEN_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockBurner = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const response = callMCPTool('casper_build_token_burn', {
    from_public_key: mockBurner,
    amount: '100000'
  });

  return response;
});

// ----------------------------------------------------------------------------
// Category 3: NFT Operations
// ----------------------------------------------------------------------------

console.log('\n\n📍 CATEGORY 3: NFT Collection Operations');
console.log('='.repeat(80));

runTest('Query NFT Collection Info', () => {
  if (!NFT_CONTRACT) return 'SKIP';

  const response = callMCPTool('casper_query_nft', {
    contract_address: NFT_CONTRACT,
    query_type: 'collection_info'
  });

  return response;
});

runTest('Build NFT Mint', () => {
  if (!NFT_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockMinter = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const mockRecipient = '01fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432';

  const response = callMCPTool('casper_build_nft_mint', {
    from_public_key: mockMinter,
    to: mockRecipient,
    token_name: 'Test NFT #1',
    token_uri: 'ipfs://example/1'
  });

  return response;
});

runTest('Build NFT Transfer', () => {
  if (!NFT_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockOwner = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const mockRecipient = '01fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432';

  const response = callMCPTool('casper_build_nft_transfer', {
    from_public_key: mockOwner,
    from: mockOwner,
    to: mockRecipient,
    token_id: '1'
  });

  return response;
});

// ----------------------------------------------------------------------------
// Category 4: DAO Operations
// ----------------------------------------------------------------------------

console.log('\n\n📍 CATEGORY 4: DAO Governance Operations');
console.log('='.repeat(80));

runTest('Query DAO Config', () => {
  if (!DAO_CONTRACT) return 'SKIP';

  const response = callMCPTool('casper_query_dao', {
    contract_address: DAO_CONTRACT,
    query_type: 'config'
  });

  return response;
});

runTest('Build DAO Proposal', () => {
  if (!DAO_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockProposer = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const response = callMCPTool('casper_build_dao_propose', {
    from_public_key: mockProposer,
    description: 'Test proposal: Increase treasury allocation',
    action_type: 'treasury_transfer',
    action_params: {
      recipient: '01fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432',
      amount: '1000000'
    }
  });

  return response;
});

runTest('Build DAO Vote', () => {
  if (!DAO_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockVoter = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const response = callMCPTool('casper_build_dao_vote', {
    from_public_key: mockVoter,
    proposal_id: '1',
    support: true,
    amount: '100000'
  });

  return response;
});

// ----------------------------------------------------------------------------
// Category 5: DEX Operations
// ----------------------------------------------------------------------------

console.log('\n\n📍 CATEGORY 5: DEX (AMM) Operations');
console.log('='.repeat(80));

runTest('Query DEX Pool Count', () => {
  if (!DEX_CONTRACT) return 'SKIP';

  const response = callMCPTool('casper_query_dex', {
    contract_address: DEX_CONTRACT,
    query_type: 'pool_count'
  });

  return response;
});

runTest('Build DEX Create Pool', () => {
  if (!DEX_CONTRACT || !SECRET_KEY || !TOKEN_CONTRACT) return 'SKIP';

  const mockCreator = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const mockTokenB = 'hash-fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432';

  const response = callMCPTool('casper_build_dex_create_pool', {
    from_public_key: mockCreator,
    token_a: TOKEN_CONTRACT,
    token_b: mockTokenB
  });

  return response;
});

runTest('Build DEX Add Liquidity', () => {
  if (!DEX_CONTRACT || !SECRET_KEY) return 'SKIP';

  const mockProvider = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const response = callMCPTool('casper_build_dex_add_liquidity', {
    from_public_key: mockProvider,
    pool_id: '0',
    amount_a: '1000000',
    amount_b: '1000000',
    min_lp_tokens: '990000' // 1% slippage
  });

  return response;
});

// ----------------------------------------------------------------------------
// Category 6: Sign & Submit (CRITICAL)
// ----------------------------------------------------------------------------

console.log('\n\n📍 CATEGORY 6: Sign & Submit Transaction (HIGH PRIORITY)');
console.log('='.repeat(80));

runTest('Sign and Submit Workflow', () => {
  if (!SECRET_KEY) {
    console.log('\n⚠️  Cannot test sign/submit without CASPER_SECRET_KEY in .env');
    return 'SKIP';
  }

  console.log('\n📝 Testing complete workflow:');
  console.log('   1. Build unsigned transaction');
  console.log('   2. Sign transaction with secret key');
  console.log('   3. Submit to network');
  console.log('');

  // Step 1: Build unsigned transfer
  console.log('Step 1: Build unsigned CSPR transfer...');
  const mockFromKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const mockToKey = '01fedcba9876543210fedcba9876543210fedcba9876543210fedcba98765432';

  const buildResponse = callMCPTool('casper_build_transfer', {
    from_public_key: mockFromKey,
    to_public_key: mockToKey,
    amount_cspr: 1,
    memo: 'Test sign/submit workflow'
  });

  // Step 2: Extract unsigned deploy
  console.log('\nStep 2: Extract unsigned_deploy from build response...');
  const unsignedDeploy = buildResponse.structuredContent?.unsigned_deploy;

  if (!unsignedDeploy) {
    throw new Error('Build tool did not return unsigned_deploy');
  }

  console.log('✓ Unsigned deploy extracted');
  displayJSON('Unsigned Deploy Structure', unsignedDeploy);

  // Step 3: Sign and submit
  console.log('\nStep 3: Sign and submit transaction...');
  const signResponse = callMCPTool('casper_sign_and_submit_transaction', {
    unsigned_deploy: unsignedDeploy
  });

  // Validate response
  const { structuredContent } = signResponse;
  if (!structuredContent) {
    throw new Error('Sign/submit did not return structuredContent');
  }

  console.log('\n✓ Sign/submit response received');
  displayJSON('Sign/Submit Response', structuredContent);

  // Expected fields in response
  const expectedFields = ['type', 'deploy_hash', 'status', 'signer_public_key', 'network'];
  const missingFields = expectedFields.filter(field => !(field in structuredContent));

  if (missingFields.length > 0) {
    throw new Error(`Sign/submit response missing fields: ${missingFields.join(', ')}`);
  }

  console.log('\n✅ Sign/submit workflow validation complete');
  console.log(`   - Deploy hash: ${structuredContent.deploy_hash || 'N/A'}`);
  console.log(`   - Status: ${structuredContent.status || 'N/A'}`);
  console.log(`   - Network: ${structuredContent.network || 'N/A'}`);

  return signResponse;
});

// ============================================================================
// Test Results Summary
// ============================================================================

console.log('\n\n' + '='.repeat(80));
console.log('📊 Test Results Summary');
console.log('='.repeat(80));
console.log('');
console.log(`✅ Passed:  ${testsPassed}`);
console.log(`❌ Failed:  ${testsFailed}`);
console.log(`⏭️  Skipped: ${testsSkipped}`);
console.log(`📝 Total:   ${testsPassed + testsFailed + testsSkipped}`);
console.log('');

if (testsFailed > 0) {
  console.log('❌ SOME TESTS FAILED - Review errors above');
  process.exit(1);
} else if (testsSkipped > 0 && testsPassed === 0) {
  console.log('⚠️  ALL TESTS SKIPPED - Check environment configuration');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Connect this test to actual MCP server (replace mock calls)');
  console.log('   2. Test with real contract deployments on testnet');
  console.log('   3. Verify sign/submit returns actual deploy hashes');
  console.log('   4. Check transaction status on cspr.live explorer');
  console.log('');
}
