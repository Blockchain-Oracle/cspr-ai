/**
 * Additional Transaction Type Testing
 *
 * Tests remaining transaction types with Transaction V1 format:
 * 1. NFT: Transfer, Burn
 * 2. Token: Transfer
 * 3. DEX: Add liquidity, Swap
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

// Initialize
const secretKey = getSecretKeyFromEnv();
const privateKey = loadPrivateKey(secretKey);
const publicKey = privateKey.publicKey.toHex();
const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);

console.log('=== Additional Transaction Type Testing ===');
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

// NFT Contract
const NFT_CONTRACT = extractHash(process.env.CASPER_NFT_CONTRACT_ADDRESS);
console.log('\n=== NFT OPERATIONS ===');
console.log('NFT Contract Hash:', NFT_CONTRACT);

// 1. NFT Transfer (requires existing token - we'll use token_id 0 if it exists)
const nftTransferUnsigned = {
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
      entry_point: 'transfer_from',
      hash_type: 'package',
      args: [
        ['from', { cl_type: 'Key', parsed: publicKey }],
        ['to', { cl_type: 'Key', parsed: publicKey }],  // Transfer to self for testing
        ['token_id', { cl_type: 'U256', parsed: '0' }]
      ]
    }
  }
};

await submitTx('NFT: Transfer', nftTransferUnsigned);

await new Promise(resolve => setTimeout(resolve, 2000));

// 2. NFT Burn (burn token_id 0)
const nftBurnUnsigned = {
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
      entry_point: 'burn',
      hash_type: 'package',
      args: [
        ['token_id', { cl_type: 'U256', parsed: '0' }]
      ]
    }
  }
};

await submitTx('NFT: Burn', nftBurnUnsigned);

// Token Contract
const TOKEN_CONTRACT = extractHash(process.env.CASPER_TOKEN_CONTRACT_ADDRESS);
console.log('\n=== TOKEN OPERATIONS ===');
console.log('Token Contract Hash:', TOKEN_CONTRACT);

await new Promise(resolve => setTimeout(resolve, 2000));

// 3. Token Transfer
const tokenTransferUnsigned = {
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
      entry_point: 'transfer',
      hash_type: 'package',
      args: [
        ['recipient', { cl_type: 'Key', parsed: publicKey }],  // Transfer to self for testing
        ['amount', { cl_type: 'U256', parsed: '100000000' }]
      ]
    }
  }
};

await submitTx('Token: Transfer', tokenTransferUnsigned);

// DEX Contract
const DEX_CONTRACT = extractHash(process.env.CASPER_DEX_CONTRACT_ADDRESS);
console.log('\n=== DEX OPERATIONS ===');
console.log('DEX Contract Hash:', DEX_CONTRACT);

await new Promise(resolve => setTimeout(resolve, 2000));

// 4. Add Liquidity (assumes pool_id 0 exists from previous test)
const addLiquidityUnsigned = {
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
      entry_point: 'add_liquidity',
      hash_type: 'package',
      args: [
        ['pool_id', { cl_type: 'U64', parsed: 0 }],
        ['amount_a', { cl_type: 'U256', parsed: '1000000000' }],
        ['amount_b', { cl_type: 'U256', parsed: '1000000000' }],
        ['min_lp_tokens', { cl_type: 'U256', parsed: '0' }]
      ]
    }
  }
};

await submitTx('DEX: Add Liquidity', addLiquidityUnsigned);

await new Promise(resolve => setTimeout(resolve, 2000));

// 5. Swap (assumes pool_id 0 exists)
const swapUnsigned = {
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
      entry_point: 'swap_exact_tokens_for_tokens',
      hash_type: 'package',
      args: [
        ['pool_id', { cl_type: 'U64', parsed: 0 }],
        ['token_in', { cl_type: 'Key', parsed: `hash-${TOKEN_CONTRACT}` }],
        ['amount_in', { cl_type: 'U256', parsed: '100000000' }],
        ['min_amount_out', { cl_type: 'U256', parsed: '0' }]
      ]
    }
  }
};

await submitTx('DEX: Swap', swapUnsigned);

console.log('\n=== ADDITIONAL TESTING COMPLETE ===');
console.log('Check transaction statuses on testnet explorer');
