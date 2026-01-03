/**
 * Dump Transaction JSON to see exact structure from .build()
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import {
  loadPrivateKey,
  getSecretKeyFromEnv,
} from './dist/utils/signing.js';
import casperSdk from 'casper-js-sdk';

const { NativeTransferBuilder, PublicKey } = casperSdk;

async function dumpTransactionJson() {
  const secretKey = getSecretKeyFromEnv();
  const privateKey = loadPrivateKey(secretKey);
  const publicKeyHex = privateKey.publicKey.toHex();
  const senderKey = PublicKey.fromHex(publicKeyHex);

  // Build a simple transfer with .build() (Transaction format)
  const builder = new NativeTransferBuilder();
  const transaction = builder
    .from(senderKey)
    .target(senderKey)
    .amount('100000000')
    .chainName('casper-test')
    .ttl(1800000)
    .payment(100000000)
    .build();  // Transaction format (2.0)

  // Sign
  transaction.sign(privateKey);

  console.log('=== TRANSACTION OBJECT (from .build()) ===\n');
  console.log('Transaction type:', transaction.constructor.name);
  console.log('Has getDeploy():', typeof transaction.getDeploy === 'function', '-> returns:', transaction.getDeploy?.());
  console.log('');

  // Try to serialize it
  console.log('=== ATTEMPTING JSON SERIALIZATION ===\n');

  // Check if it has toJSON method
  if (typeof transaction.toJSON === 'function') {
    const json = transaction.toJSON();
    console.log('transaction.toJSON():');
    console.log(JSON.stringify(json, null, 2));
  } else {
    console.log('No toJSON() method available');
  }

  // Try direct serialization
  console.log('\n=== DIRECT JSON.stringify() ===\n');
  try {
    const direct = JSON.stringify(transaction, null, 2);
    console.log(direct);
  } catch (e) {
    console.log('Direct serialization failed:', e.message);
  }

  // Inspect object properties
  console.log('\n=== TRANSACTION PROPERTIES ===\n');
  console.log('Keys:', Object.keys(transaction));

  // Try accessing known properties
  console.log('\nKnown properties:');
  console.log('  hash:', transaction.hash);
  console.log('  header:', transaction.header);
  console.log('  body:', transaction.body);
  console.log('  approvals:', transaction.approvals);

  // Check for Version1 wrapper
  console.log('\nChecking for Version1 wrapper:');
  console.log('  transaction.Version1:', transaction.Version1);

  // Try to call bytes() if available
  if (typeof transaction.bytes === 'function') {
    console.log('\n=== TRANSACTION BYTES ===');
    const txBytes = transaction.bytes();
    console.log('Byte length:', txBytes.length);
    console.log('First 100 bytes (hex):');
    console.log(Array.from(txBytes.slice(0, 100))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''));
  }
}

dumpTransactionJson().catch(error => {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
