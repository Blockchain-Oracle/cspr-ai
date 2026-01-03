/**
 * Permissionless Access Testing
 *
 * CRITICAL TEST: Verify that ANY wallet can interact with contracts, not just deployer
 *
 * Steps:
 * 1. Generate a fresh random wallet
 * 2. Transfer CSPR from deployer to new wallet (for gas)
 * 3. Transfer tokens from deployer to new wallet
 * 4. Use NEW wallet to:
 *    - Mint tokens (if allowed)
 *    - Transfer tokens (should work)
 *    - Create DAO proposal (should work)
 *    - Vote on proposal (should work)
 *    - Add DEX liquidity (should work)
 *    - Perform swap (should work)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import casperSdk from 'casper-js-sdk';
const { PrivateKey, KeyAlgorithm } = casperSdk;

import {
  getSecretKeyFromEnv,
  loadPrivateKey,
  reconstructTransaction,
  signTransaction,
  transactionToJson
} from './dist/utils/signing.js';

import { CasperClient } from './dist/services/casper-client.js';
import { serializeProposalAction } from './dist/utils/enum-serialization.js';

// Initialize deployer wallet
const deployerSecretKey = getSecretKeyFromEnv();
const deployerPrivateKey = loadPrivateKey(deployerSecretKey);
const deployerPublicKey = deployerPrivateKey.publicKey.toHex();

// Generate NEW random wallet
console.log('=== Generating Random Wallet ===');
const newPrivateKey = PrivateKey.generate(KeyAlgorithm.ED25519);
const newPublicKey = newPrivateKey.publicKey.toHex();
// Export as PEM format for easier reuse
const newSecretKeyPEM = newPrivateKey.toPem();

console.log('Deployer Public Key:', deployerPublicKey);
console.log('New Wallet Public Key:', newPublicKey);
console.log('New Wallet Secret Key (PEM):');
console.log(newSecretKeyPEM);
console.log('⚠️  Save this secret key for testing!');
console.log();

const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);

// Helper to submit transaction
async function submitTx(name, unsignedDeploy, signingKey) {
  console.log(`\n--- ${name} ---`);

  try {
    const transaction = reconstructTransaction(unsignedDeploy);
    signTransaction(transaction, signingKey);
    const txHash = await client.submitTransaction(transaction);

    console.log('✅ SUCCESS');
    console.log('Transaction Hash:', txHash);
    console.log('Explorer:', `https://testnet.cspr.live/deploy/${txHash}`);

    return txHash;
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Error:', error.message);
    return null;
  }
}

function extractHash(contractAddress) {
  if (contractAddress.startsWith('contract-package-')) {
    return contractAddress.replace('contract-package-', '');
  }
  if (contractAddress.startsWith('hash-')) {
    return contractAddress.replace('hash-', '');
  }
  return contractAddress;
}

// Contract addresses
const TOKEN_CONTRACT = extractHash(process.env.CASPER_TOKEN_CONTRACT_ADDRESS);
const DAO_CONTRACT = extractHash(process.env.CASPER_DAO_CONTRACT_ADDRESS);
const DEX_CONTRACT = extractHash(process.env.CASPER_DEX_CONTRACT_ADDRESS);

console.log('=== STEP 1: Fund New Wallet with CSPR ===');
// Transfer 100 CSPR to new wallet for gas
const fundWalletTx = {
  header: {
    account: deployerPublicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '100000000' }]]  // 0.1 CSPR
    }
  },
  session: {
    transfer: {
      args: [
        ['amount', { cl_type: 'U512', parsed: '100000000000' }],  // 100 CSPR
        ['target', { cl_type: 'Key', parsed: newPublicKey }],
        ['id', { cl_type: 'U64', parsed: Date.now() }]
      ]
    }
  }
};

await submitTx('Fund Wallet: 100 CSPR', fundWalletTx, deployerPrivateKey);

console.log('\nℹ️  Waiting 30 seconds for CSPR transfer to process...');
await new Promise(resolve => setTimeout(resolve, 30000));

console.log('\n=== STEP 2: Transfer Tokens to New Wallet ===');
// Transfer 1000 tokens to new wallet
const transferTokensTx = {
  header: {
    account: deployerPublicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]  // 5 CSPR
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: TOKEN_CONTRACT,
      entry_point: 'transfer',
      hash_type: 'package',
      args: [
        ['recipient', { cl_type: 'Key', parsed: newPublicKey }],
        ['amount', { cl_type: 'U256', parsed: '1000000000000' }]  // 1000 tokens (with decimals)
      ]
    }
  }
};

await submitTx('Transfer Tokens: 1000 tokens', transferTokensTx, deployerPrivateKey);

console.log('\nℹ️  Waiting 30 seconds for token transfer to process...');
await new Promise(resolve => setTimeout(resolve, 30000));

console.log('\n=== STEP 3: Test NEW Wallet Transactions ===');
console.log('🔑 Now using NEW wallet:', newPublicKey);

// 1. NEW WALLET: Transfer tokens back (proves token ownership works)
console.log('\n--- Test 1: Token Transfer from New Wallet ---');
const newWalletTokenTransfer = {
  header: {
    account: newPublicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]  // 5 CSPR
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: TOKEN_CONTRACT,
      entry_point: 'transfer',
      hash_type: 'package',
      args: [
        ['recipient', { cl_type: 'Key', parsed: deployerPublicKey }],  // Send back to deployer
        ['amount', { cl_type: 'U256', parsed: '100000000' }]  // 100 tokens
      ]
    }
  }
};

await submitTx('New Wallet: Token Transfer', newWalletTokenTransfer, newPrivateKey);
await new Promise(resolve => setTimeout(resolve, 2000));

// 2. NEW WALLET: Create DAO proposal
console.log('\n--- Test 2: DAO Proposal from New Wallet ---');

// Serialize the ProposalAction enum properly
const newWalletProposalAction = {
  type: 'custom',
  params: {
    description: 'Proposal from new wallet - testing permissionless access'
  }
};

const newWalletActionBytes = serializeProposalAction(newWalletProposalAction);

const newWalletDAOProposal = {
  header: {
    account: newPublicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]  // 5 CSPR
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: DAO_CONTRACT,
      entry_point: 'create_proposal',
      hash_type: 'package',
      args: [
        ['description', { cl_type: 'String', parsed: 'Proposal from new wallet with correct serialization' }],
        ['action', { cl_type: 'ByteArray', bytes: newWalletActionBytes.toString('hex'), parsed: Array.from(newWalletActionBytes) }]
      ]
    }
  }
};

await submitTx('New Wallet: DAO Proposal', newWalletDAOProposal, newPrivateKey);
await new Promise(resolve => setTimeout(resolve, 2000));

// 3. NEW WALLET: Vote on DAO proposal
console.log('\n--- Test 3: DAO Vote from New Wallet ---');
const newWalletDAOVote = {
  header: {
    account: newPublicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]  // 5 CSPR
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: DAO_CONTRACT,
      entry_point: 'vote',
      hash_type: 'package',
      args: [
        ['proposal_id', { cl_type: 'U64', parsed: 0 }],
        ['support', { cl_type: 'Bool', parsed: true }],
        ['amount', { cl_type: 'U512', parsed: '100000000' }]
      ]
    }
  }
};

await submitTx('New Wallet: DAO Vote', newWalletDAOVote, newPrivateKey);
await new Promise(resolve => setTimeout(resolve, 2000));

// 4. NEW WALLET: Add DEX liquidity
console.log('\n--- Test 4: DEX Add Liquidity from New Wallet ---');
const newWalletAddLiquidity = {
  header: {
    account: newPublicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]  // 5 CSPR
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: DEX_CONTRACT,
      entry_point: 'add_liquidity',
      hash_type: 'package',
      args: [
        ['pool_id', { cl_type: 'U64', parsed: 0 }],
        ['amount_a', { cl_type: 'U256', parsed: '100000000' }],
        ['amount_b', { cl_type: 'U256', parsed: '100000000' }],
        ['min_lp_tokens', { cl_type: 'U256', parsed: '0' }]
      ]
    }
  }
};

await submitTx('New Wallet: Add Liquidity', newWalletAddLiquidity, newPrivateKey);
await new Promise(resolve => setTimeout(resolve, 2000));

// 5. NEW WALLET: Perform swap
console.log('\n--- Test 5: DEX Swap from New Wallet ---');
const newWalletSwap = {
  header: {
    account: newPublicKey,
    chain_name: client.getChainName(),
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]  // 5 CSPR
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: DEX_CONTRACT,
      entry_point: 'swap_exact_tokens_for_tokens',
      hash_type: 'package',
      args: [
        ['pool_id', { cl_type: 'U64', parsed: 0 }],
        ['token_in', { cl_type: 'Key', parsed: `hash-${TOKEN_CONTRACT}` }],
        ['amount_in', { cl_type: 'U256', parsed: '50000000' }],
        ['min_amount_out', { cl_type: 'U256', parsed: '0' }]
      ]
    }
  }
};

await submitTx('New Wallet: Swap', newWalletSwap, newPrivateKey);

console.log('\n=== PERMISSIONLESS ACCESS TEST COMPLETE ===');
console.log('\n✅ Results Summary:');
console.log('If ALL transactions succeeded, the contracts are PERMISSIONLESS');
console.log('Anyone can: transfer tokens, create proposals, vote, add liquidity, swap');
console.log('\nNew wallet details for future testing:');
console.log('Public Key:', newPublicKey);
console.log('Secret Key (PEM):');
console.log(newSecretKeyPEM);
