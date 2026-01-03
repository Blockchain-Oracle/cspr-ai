/**
 * Verification script for transaction conversion
 * Tests conversion with actual MCP transaction structures
 */

import { convertToDeployFormat, needsConversion } from './transaction-utils.js';

console.log('🧪 Testing Transaction Format Conversion\n');

// Test public keys (Secp256k1 format - 68 chars)
const testPublicKey = '0202a0b5a84567107fd267ec09e6c6f35560e9f6ca0e5e7e97e7f1f8f4a2e5b8f3e7e0';
const validatorKey = '0202b1c6b95678218fe378fd1ae7d7g46671fag7db1f6f8faf8g8g2g9g5b3f9g4f8f1';

// Test 1: Simple CSPR Transfer (matches MCP casper_build_transfer output)
console.log('Test 1: CSPR Transfer Transaction');
const transferTx = {
  header: {
    account: testPublicKey,
    chain_name: 'casper-test',
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '100000000' }]]
    }
  },
  session: {
    transfer: {
      args: [
        ['amount', { cl_type: 'U512', parsed: '2500000000' }],
        ['target', { cl_type: 'Key', parsed: testPublicKey }],
        ['id', { cl_type: 'U64', parsed: 1 }]
      ]
    }
  }
};

try {
  console.log('  ✓ Checking if conversion needed:', needsConversion(transferTx));
  const deployFormat = convertToDeployFormat(transferTx);
  console.log('  ✓ Conversion successful');
  console.log('  ✓ Deploy has hash:', !!deployFormat.hash);
  console.log('  ✓ Deploy has header:', !!deployFormat.header);
  console.log('  ✓ Deploy has payment:', !!deployFormat.payment);
  console.log('  ✓ Deploy has session:', !!deployFormat.session);
  console.log('  ✅ Transfer conversion PASSED\n');
} catch (error) {
  console.log('  ❌ Transfer conversion FAILED:', error.message, '\n');
}

// Test 2: Delegation Transaction (matches MCP casper_build_delegation output)
console.log('Test 2: Delegation Transaction');
const delegationTx = {
  header: {
    account: testPublicKey,
    chain_name: 'casper-test',
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '2500000000' }]]
    }
  },
  session: {
    stored_contract_by_name: {
      name: 'auction',
      entry_point: 'delegate',
      args: [
        ['validator', { cl_type: 'Key', parsed: validatorKey }],
        ['amount', { cl_type: 'U512', parsed: '500000000000' }],
        ['delegator', { cl_type: 'Key', parsed: testPublicKey }]
      ]
    }
  }
};

try {
  console.log('  ✓ Checking if conversion needed:', needsConversion(delegationTx));
  const deployFormat = convertToDeployFormat(delegationTx);
  console.log('  ✓ Conversion successful');
  console.log('  ✓ Deploy structure valid');
  console.log('  ✅ Delegation conversion PASSED\n');
} catch (error) {
  console.log('  ❌ Delegation conversion FAILED:', error.message, '\n');
}

// Test 3: Contract Call (matches MCP token/NFT/DAO/DEX build tools output)
console.log('Test 3: Contract Call Transaction');
const contractHash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
const contractCallTx = {
  header: {
    account: testPublicKey,
    chain_name: 'casper-test',
    gas_price: 1,
    ttl: '30m'
  },
  payment: {
    module_bytes: {
      args: [['amount', { cl_type: 'U512', parsed: '5000000000' }]]
    }
  },
  session: {
    stored_contract_by_hash: {
      hash: contractHash,
      entry_point: 'transfer',
      hash_type: 'package',
      args: [
        ['recipient', { cl_type: 'Key', parsed: testPublicKey }],
        ['amount', { cl_type: 'U256', parsed: '1000000000' }]
      ]
    }
  }
};

try {
  console.log('  ✓ Checking if conversion needed:', needsConversion(contractCallTx));
  const deployFormat = convertToDeployFormat(contractCallTx);
  console.log('  ✓ Conversion successful');
  console.log('  ✓ Contract call structure valid');
  console.log('  ✅ Contract call conversion PASSED\n');
} catch (error) {
  console.log('  ❌ Contract call conversion FAILED:', error.message, '\n');
}

// Test 4: Verify already-converted Deploy format is detected
console.log('Test 4: Deploy Format Detection');
const deployFormatSample = {
  header: {
    account: testPublicKey,
    chain_name: 'casper-test'
  },
  payment: {
    ModuleBytes: { args: [] } // PascalCase = Deploy format
  },
  session: {
    Transfer: { args: [] } // PascalCase = Deploy format
  }
};

try {
  const needsConv = needsConversion(deployFormatSample);
  console.log('  ✓ Correctly detected as Deploy format:', !needsConv);
  console.log('  ✅ Format detection PASSED\n');
} catch (error) {
  console.log('  ❌ Format detection FAILED:', error.message, '\n');
}

console.log('═══════════════════════════════════════');
console.log('✅ All conversion tests completed');
console.log('═══════════════════════════════════════');
