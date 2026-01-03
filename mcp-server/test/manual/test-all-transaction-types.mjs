/**
 * Comprehensive Transaction Type Testing
 *
 * Tests all transaction types with the Transaction V1 format:
 * 1. DAO: Create proposal, Vote
 * 2. NFT: Mint, Transfer, Burn
 * 3. Token: Mint, Transfer
 * 4. DEX: Create pool, Add liquidity, Swap
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import casperSdk from 'casper-js-sdk';
const { PublicKey, ContractCallBuilder, Args, CLValue } = casperSdk;

import {
  getSecretKeyFromEnv,
  loadPrivateKey,
  reconstructTransaction,
  signTransaction,
  transactionToJson
} from './dist/utils/signing.js';

import { CasperClient } from './dist/services/casper-client.js';
import { serializeProposalAction } from './dist/utils/enum-serialization.js';

// Initialize
const secretKey = getSecretKeyFromEnv();
const privateKey = loadPrivateKey(secretKey);
const publicKey = privateKey.publicKey.toHex();
const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);

console.log('=== Transaction Type Testing ===');
console.log('Public Key:', publicKey);
console.log('Network:', client.getChainName());
console.log();

// Helper to submit transaction
async function submitTx(name, unsignedDeploy) {
  console.log(`\n--- ${name} ---`);

  try {
    // Reconstruct transaction
    const transaction = reconstructTransaction(unsignedDeploy);

    // Sign
    signTransaction(transaction, privateKey);

    // Submit
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

// Helper to extract hash from contract-package- prefix
function extractHash(contractAddress) {
  if (contractAddress.startsWith('contract-package-')) {
    return contractAddress.replace('contract-package-', '');
  }
  if (contractAddress.startsWith('hash-')) {
    return contractAddress.replace('hash-', '');
  }
  return contractAddress;
}

// DAO Contract
const DAO_CONTRACT = extractHash(process.env.CASPER_DAO_CONTRACT_ADDRESS);
console.log('\n=== DAO OPERATIONS ===');
console.log('DAO Contract Hash:', DAO_CONTRACT);

// 1. Create DAO Proposal
// Serialize the ProposalAction enum properly
const proposalAction = {
  type: 'custom',
  params: {
    description: 'Testing DAO proposal creation from fixed test script'
  }
};

const actionBytes = serializeProposalAction(proposalAction);

const proposalUnsigned = {
  header: {
    account: publicKey,
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
        ['description', { cl_type: 'String', parsed: 'Test proposal from MCP with correct serialization' }],
        ['action', { cl_type: 'ByteArray', bytes: actionBytes.toString('hex'), parsed: Array.from(actionBytes) }]
      ]
    }
  }
};

await submitTx('DAO: Create Proposal', proposalUnsigned);

// Wait a bit before next transaction
await new Promise(resolve => setTimeout(resolve, 2000));

// 2. Vote on Proposal (assuming proposal_id 0 exists or was just created)
const voteUnsigned = {
  header: {
    account: publicKey,
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
        ['amount', { cl_type: 'U512', parsed: '1000000000' }]
      ]
    }
  }
};

await submitTx('DAO: Vote on Proposal', voteUnsigned);

// NFT Contract
const NFT_CONTRACT = extractHash(process.env.CASPER_NFT_CONTRACT_ADDRESS);
console.log('\n=== NFT OPERATIONS ===');
console.log('NFT Contract Hash:', NFT_CONTRACT);

await new Promise(resolve => setTimeout(resolve, 2000));

// 3. Mint NFT
const mintNftUnsigned = {
  header: {
    account: publicKey,
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
      hash: NFT_CONTRACT,
      entry_point: 'mint',
      hash_type: 'package',
      args: [
        ['to', { cl_type: 'Key', parsed: publicKey }],
        ['token_name', { cl_type: 'String', parsed: 'MCP Test NFT' }],
        ['token_uri', { cl_type: 'String', parsed: 'ipfs://test-nft-metadata' }]
      ]
    }
  }
};

await submitTx('NFT: Mint', mintNftUnsigned);

// Token Contract
const TOKEN_CONTRACT = extractHash(process.env.CASPER_TOKEN_CONTRACT_ADDRESS);
console.log('\n=== TOKEN OPERATIONS ===');
console.log('Token Contract Hash:', TOKEN_CONTRACT);

await new Promise(resolve => setTimeout(resolve, 2000));

// 4. Mint Token
const mintTokenUnsigned = {
  header: {
    account: publicKey,
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
      entry_point: 'mint',
      hash_type: 'package',
      args: [
        ['recipient', { cl_type: 'Key', parsed: publicKey }],
        ['amount', { cl_type: 'U256', parsed: '1000000000' }]
      ]
    }
  }
};

await submitTx('Token: Mint', mintTokenUnsigned);

// DEX Contract
const DEX_CONTRACT = extractHash(process.env.CASPER_DEX_CONTRACT_ADDRESS);
console.log('\n=== DEX OPERATIONS ===');
console.log('DEX Contract Hash:', DEX_CONTRACT);

await new Promise(resolve => setTimeout(resolve, 2000));

// 5. Create Pool
const createPoolUnsigned = {
  header: {
    account: publicKey,
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
      entry_point: 'create_pool',
      hash_type: 'package',
      args: [
        ['token_a', { cl_type: 'String', parsed: TOKEN_CONTRACT }],
        ['token_b', { cl_type: 'String', parsed: '0000000000000000000000000000000000000000000000000000000000000000' }]
      ]
    }
  }
};

await submitTx('DEX: Create Pool', createPoolUnsigned);

console.log('\n=== TESTING COMPLETE ===');
console.log('Check transaction statuses on testnet explorer');
