/**
 * Test single contract call with full JSON logging
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

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

console.log('=== Single Contract Call Test ===');
console.log('Public Key:', publicKey);
console.log('Network:', client.getChainName());
console.log();

// Extract hash
function extractHash(contractAddress) {
  if (contractAddress.startsWith('contract-package-')) {
    return contractAddress.replace('contract-package-', '');
  }
  return contractAddress;
}

const DAO_CONTRACT = extractHash(process.env.CASPER_DAO_CONTRACT_ADDRESS);

// DAO Proposal - simplest possible contract call
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
      entry_point: 'propose',
      hash_type: 'package',
      args: [
        ['description', { cl_type: 'String', parsed: 'Test' }],
        ['action_type', { cl_type: 'String', parsed: 'custom' }],
        ['action_params', { cl_type: 'String', parsed: '{}' }]
      ]
    }
  }
};

console.log('=== UNSIGNED DEPLOY ===');
console.log(JSON.stringify(proposalUnsigned, null, 2));
console.log();

try {
  // Reconstruct
  const transaction = reconstructTransaction(proposalUnsigned);

  console.log('=== RECONSTRUCTED TRANSACTION ===');
  console.log(JSON.stringify(transactionToJson(transaction), null, 2));
  console.log();

  // Sign
  signTransaction(transaction, privateKey);

  console.log('=== SIGNED TRANSACTION ===');
  console.log(JSON.stringify(transactionToJson(transaction), null, 2));
  console.log();

  // Submit
  console.log('=== SUBMITTING ===');
  const txHash = await client.submitTransaction(transaction);

  console.log('✅ SUCCESS');
  console.log('Transaction Hash:', txHash);
} catch (error) {
  console.log('❌ FAILED');
  console.log('Error:', error.message);
  if (error.stack) {
    console.log('Stack:', error.stack);
  }
}
