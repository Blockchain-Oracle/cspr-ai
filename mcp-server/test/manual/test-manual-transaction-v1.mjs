/**
 * Manually construct correct Transaction V1 format and submit via raw RPC
 * Based on Casper 2.0 documentation structure
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import {
  loadPrivateKey,
  getSecretKeyFromEnv,
} from './dist/utils/signing.js';
import casperSdk from 'casper-js-sdk';
import crypto from 'crypto';

const { PublicKey, CLPublicKey, CLValueBuilder, Serialization } = casperSdk;

const TESTNET_RPC = 'https://node.testnet.casper.network/rpc';

async function testManualTransactionV1() {
  console.log('=== MANUALLY CONSTRUCTING TRANSACTION V1 FORMAT ===\n');

  const secretKey = getSecretKeyFromEnv();
  const privateKey = loadPrivateKey(secretKey);
  const publicKeyHex = privateKey.publicKey.toHex();

  console.log(`From: ${publicKeyHex}`);
  console.log(`To: ${publicKeyHex} (self)`);
  console.log(`Amount: 0.1 CSPR\n`);

  // Build args in correct format
  const targetArg = [
    'target',
    {
      cl_type: 'PublicKey',
      bytes: publicKeyHex,
      parsed: publicKeyHex
    }
  ];

  const amountArg = [
    'amount',
    {
      cl_type: 'U512',
      bytes: '0400e1f505', // 100000000 in little-endian bytes
      parsed: '100000000'
    }
  ];

  const timestamp = new Date().toISOString();
  const chainName = 'casper-test';

  // Construct body
  const body = {
    args: [targetArg, amountArg],
    target: 'Native',
    entry_point: 'Transfer',
    transaction_category: 0,
    scheduling: 'Standard'
  };

  // Compute body_hash (simplified - should be actual blake2b hash)
  const bodyStr = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

  // Construct header
  const header = {
    chain_name: chainName,
    timestamp: timestamp,
    ttl: '1h',
    body_hash: bodyHash,
    pricing_mode: {
      Fixed: {
        gas_price_tolerance: 5
      }
    },
    initiator_addr: {
      PublicKey: publicKeyHex
    }
  };

  // Compute transaction hash (simplified)
  const headerStr = JSON.stringify(header);
  const txHash = crypto.createHash('sha256').update(headerStr + bodyStr).digest('hex');

  // Sign the hash
  const hashBytes = Buffer.from(txHash, 'hex');
  const signature = privateKey.sign(hashBytes);
  const signatureHex = Buffer.from(signature).toString('hex');

  // Construct approvals
  const approvals = [
    {
      signer: publicKeyHex,
      signature: '01' + signatureHex // prepend key algorithm tag
    }
  ];

  // Construct full Transaction V1 structure
  const transactionV1 = {
    Version1: {
      hash: txHash,
      header: header,
      body: body,
      approvals: approvals
    }
  };

  console.log('=== TRANSACTION V1 STRUCTURE ===');
  console.log(JSON.stringify(transactionV1, null, 2));
  console.log('');

  // Submit via raw RPC
  console.log('=== SUBMITTING VIA RAW RPC ===');

  try {
    const response = await fetch(TESTNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'account_put_transaction',
        params: {
          transaction: transactionV1
        },
        id: 1
      })
    });

    const data = await response.json();

    if (data.error) {
      console.log('❌ FAILED:', JSON.stringify(data.error, null, 2));
    } else {
      console.log('✅ SUCCESS!');
      console.log(JSON.stringify(data, null, 2));

      const txHashReturned = data.result?.transaction_hash?.Version1 || data.result?.transaction_hash;
      console.log(`\nTransaction Hash: ${txHashReturned}`);
      console.log(`Explorer: https://testnet.cspr.live/deploy/${txHashReturned}`);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testManualTransactionV1().catch(error => {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
