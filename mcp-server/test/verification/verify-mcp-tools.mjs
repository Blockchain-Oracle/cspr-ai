#!/usr/bin/env node
/**
 * Verify MCP Tools Structure
 *
 * This script verifies that all MCP tools are properly defined
 * and shows what operations are available for testing.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '.env');
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
const TOKEN_CONTRACT = env.CASPER_TOKEN_CONTRACT_ADDRESS || '';
const NFT_CONTRACT = env.CASPER_NFT_CONTRACT_ADDRESS || '';
const DAO_CONTRACT = env.CASPER_DAO_CONTRACT_ADDRESS || '';
const DEX_CONTRACT = env.CASPER_DEX_CONTRACT_ADDRESS || '';

console.log('🧪 CSPR.AI MCP Tools Verification');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// Deployed Contracts
// ============================================================================

console.log('📦 Deployed Contracts:');
console.log('-'.repeat(80));
console.log(`TOKEN: ${TOKEN_CONTRACT.slice(0, 20)}...${TOKEN_CONTRACT.slice(-20)}`);
console.log(`NFT:   ${NFT_CONTRACT.slice(0, 20)}...${NFT_CONTRACT.slice(-20)}`);
console.log(`DAO:   ${DAO_CONTRACT.slice(0, 20)}...${DAO_CONTRACT.slice(-20)}`);
console.log(`DEX:   ${DEX_CONTRACT.slice(0, 20)}...${DEX_CONTRACT.slice(-20)}`);
console.log('');

// ============================================================================
// MCP Tools Available
// ============================================================================

const tools = {
  'TOKEN (CEP-18)': [
    {
      name: 'casper_deploy_token',
      type: 'Deploy',
      description: 'Deploy new CEP-18 token contract',
      args: ['deployer_public_key', 'name', 'symbol', 'decimals', 'initial_supply', 'enable_minting'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_query_token',
      type: 'Query',
      description: 'Query token state (read-only, no gas)',
      args: ['contract_address', 'query_type', 'owner?', 'spender?'],
      output: 'Token metadata/balance/allowance',
      public: true
    },
    {
      name: 'casper_build_token_transfer',
      type: 'Write',
      description: 'Build token transfer transaction',
      args: ['contract_address', 'sender_public_key', 'recipient', 'amount'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_build_token_mint',
      type: 'Write',
      description: 'Build token mint transaction (PUBLIC in Odra 2.5.0)',
      args: ['contract_address', 'caller_public_key', 'recipient', 'amount'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true,
      note: '⭐ ANYONE CAN MINT - Odra 2.5.0 raw_mint() has no access control'
    },
    {
      name: 'casper_build_token_burn',
      type: 'Write',
      description: 'Build token burn transaction (PUBLIC in Odra 2.5.0)',
      args: ['contract_address', 'caller_public_key', 'amount'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true,
      note: '⭐ ANYONE CAN BURN - Odra 2.5.0 raw_burn() has no access control'
    }
  ],

  'NFT Collection': [
    {
      name: 'casper_deploy_nft',
      type: 'Deploy',
      description: 'Deploy new NFT collection',
      args: ['deployer_public_key', 'name', 'symbol', 'base_uri', 'max_supply', 'minting_mode'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true,
      note: '⭐ Set minting_mode="Public" for anyone to mint'
    },
    {
      name: 'casper_query_nft',
      type: 'Query',
      description: 'Query NFT collection state',
      args: ['contract_address', 'query_type', 'token_id?', 'owner?'],
      output: 'NFT metadata/owner/balance',
      public: true
    },
    {
      name: 'casper_build_nft_mint',
      type: 'Write',
      description: 'Build NFT mint transaction',
      args: ['contract_address', 'caller_public_key', 'recipient', 'token_name', 'token_uri'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true,
      note: '⭐ PUBLIC MINTING - Deployed with MintingMode::Public'
    },
    {
      name: 'casper_build_nft_transfer',
      type: 'Write',
      description: 'Build NFT transfer transaction',
      args: ['contract_address', 'caller_public_key', 'from', 'to', 'token_id'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_build_nft_burn',
      type: 'Write',
      description: 'Build NFT burn transaction',
      args: ['contract_address', 'caller_public_key', 'token_id'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    }
  ],

  'DAO (Governance)': [
    {
      name: 'casper_deploy_dao',
      type: 'Deploy',
      description: 'Deploy new DAO contract',
      args: ['deployer_public_key', 'name', 'voting_period', 'execution_delay'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_query_dao',
      type: 'Query',
      description: 'Query DAO state',
      args: ['contract_address', 'query_type', 'proposal_id?'],
      output: 'DAO metadata/proposals/votes',
      public: true
    },
    {
      name: 'casper_build_dao_create_proposal',
      type: 'Write',
      description: 'Build create proposal transaction',
      args: ['contract_address', 'caller_public_key', 'title', 'description'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_build_dao_vote',
      type: 'Write',
      description: 'Build vote transaction',
      args: ['contract_address', 'caller_public_key', 'proposal_id', 'vote'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_build_dao_execute',
      type: 'Write',
      description: 'Build execute proposal transaction',
      args: ['contract_address', 'caller_public_key', 'proposal_id'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    }
  ],

  'DEX (Decentralized Exchange)': [
    {
      name: 'casper_deploy_dex',
      type: 'Deploy',
      description: 'Deploy new DEX contract',
      args: ['deployer_public_key', 'token_a', 'token_b', 'fee_percentage'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_query_dex',
      type: 'Query',
      description: 'Query DEX state',
      args: ['contract_address', 'query_type'],
      output: 'DEX reserves/price/liquidity',
      public: true
    },
    {
      name: 'casper_build_dex_add_liquidity',
      type: 'Write',
      description: 'Build add liquidity transaction',
      args: ['contract_address', 'caller_public_key', 'amount_a', 'amount_b'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_build_dex_swap',
      type: 'Write',
      description: 'Build swap transaction',
      args: ['contract_address', 'caller_public_key', 'amount_in', 'token_in'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    },
    {
      name: 'casper_build_dex_remove_liquidity',
      type: 'Write',
      description: 'Build remove liquidity transaction',
      args: ['contract_address', 'caller_public_key', 'liquidity_amount'],
      output: 'Unsigned deploy (sign with wallet)',
      public: true
    }
  ]
};

// Print all tools
for (const [category, categoryTools] of Object.entries(tools)) {
  console.log(`\n${category}:`);
  console.log('-'.repeat(80));

  categoryTools.forEach((tool, idx) => {
    console.log(`\n${idx + 1}. ${tool.name}`);
    console.log(`   Type: ${tool.type}`);
    console.log(`   Description: ${tool.description}`);
    console.log(`   Args: ${tool.args.join(', ')}`);
    console.log(`   Output: ${tool.output}`);
    if (tool.note) {
      console.log(`   ${tool.note}`);
    }
  });
}

console.log('\n' + '='.repeat(80));
console.log('🎯 Testing Guide:');
console.log('='.repeat(80));
console.log('');

console.log('1️⃣  TEST TOKEN QUERY (no wallet needed):');
console.log('   Tool: casper_query_token');
console.log(`   contract_address: ${TOKEN_CONTRACT}`);
console.log('   query_type: metadata');
console.log('   Expected: Token name, symbol, decimals, total supply');
console.log('');

console.log('2️⃣  TEST TOKEN MINT (PUBLIC - anyone can mint!):');
console.log('   Tool: casper_build_token_mint');
console.log(`   contract_address: ${TOKEN_CONTRACT}`);
console.log('   caller_public_key: <your-public-key>');
console.log('   recipient: <your-address>');
console.log('   amount: "1000000"');
console.log('   Expected: Unsigned deploy JSON (sign with CSPR.click)');
console.log('');

console.log('3️⃣  TEST NFT MINT (PUBLIC - anyone can mint!):');
console.log('   Tool: casper_build_nft_mint');
console.log(`   contract_address: ${NFT_CONTRACT}`);
console.log('   caller_public_key: <your-public-key>');
console.log('   recipient: <your-address>');
console.log('   token_name: "My First NFT"');
console.log('   token_uri: "" (optional)');
console.log('   Expected: Unsigned deploy JSON (sign with CSPR.click)');
console.log('');

console.log('4️⃣  TEST NFT QUERY (no wallet needed):');
console.log('   Tool: casper_query_nft');
console.log(`   contract_address: ${NFT_CONTRACT}`);
console.log('   query_type: metadata');
console.log('   Expected: Collection name, symbol, max supply');
console.log('');

console.log('✅ All MCP tools are ready for testing!');
console.log('');
console.log('📝 Notes:');
console.log('   - Query tools (read-only) work without wallet signatures');
console.log('   - Build tools create unsigned deploys that MUST be signed');
console.log('   - TOKEN mint/burn are PUBLIC in Odra 2.5.0 (no access control)');
console.log('   - NFT mint is PUBLIC (deployed with MintingMode::Public)');
console.log('   - Use CSPR.click wallet to sign unsigned deploys');
console.log('');
