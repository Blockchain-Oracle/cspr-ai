/**
 * Inspect the originTransactionV1 property
 * This might contain the correct Version1 wrapper structure
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

async function inspectOriginTransaction() {
  const secretKey = getSecretKeyFromEnv();
  const privateKey = loadPrivateKey(secretKey);
  const publicKeyHex = privateKey.publicKey.toHex();
  const senderKey = PublicKey.fromHex(publicKeyHex);

  const builder = new NativeTransferBuilder();
  const transaction = builder
    .from(senderKey)
    .target(senderKey)
    .amount('100000000')
    .chainName('casper-test')
    .ttl(1800000)
    .payment(100000000)
    .build();

  transaction.sign(privateKey);

  console.log('=== CHECKING originTransactionV1 PROPERTY ===\n');

  if (transaction.originTransactionV1) {
    console.log('✅ originTransactionV1 exists!');
    console.log('Type:', transaction.originTransactionV1.constructor.name);
    console.log('');

    // Try to serialize it
    if (typeof transaction.originTransactionV1.toJSON === 'function') {
      console.log('=== originTransactionV1.toJSON() ===');
      const json = transaction.originTransactionV1.toJSON();
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log('No toJSON() method on originTransactionV1');
      console.log('Direct stringify:');
      console.log(JSON.stringify(transaction.originTransactionV1, null, 2));
    }

    // Check for Version1 wrapper
    console.log('\n=== CHECKING FOR Version1 WRAPPER ===');
    if (transaction.originTransactionV1.Version1) {
      console.log('✅ Has Version1 wrapper!');
      console.log(JSON.stringify(transaction.originTransactionV1.Version1, null, 2));
    } else {
      console.log('❌ No Version1 wrapper in originTransactionV1');
    }

  } else {
    console.log('❌ No originTransactionV1 property');
  }

  // Also check if we can directly access a Version1 structure
  console.log('\n=== CHECKING transaction.Version1 ===');
  if (transaction.Version1) {
    console.log('✅ transaction.Version1 exists!');
    console.log(JSON.stringify(transaction.Version1, null, 2));
  } else {
    console.log('❌ No Version1 property on transaction');
  }
}

inspectOriginTransaction().catch(error => {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
