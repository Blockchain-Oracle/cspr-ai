/**
 * Dump Deploy JSON to see exact structure
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import {
  loadPrivateKey,
  getSecretKeyFromEnv,
} from './dist/utils/signing.js';
import casperSdk from 'casper-js-sdk';

const { NativeTransferBuilder, PublicKey, Deploy } = casperSdk;

async function dumpDeployJson() {
  const secretKey = getSecretKeyFromEnv();
  const privateKey = loadPrivateKey(secretKey);
  const publicKeyHex = privateKey.publicKey.toHex();
  const senderKey = PublicKey.fromHex(publicKeyHex);

  // Build a simple transfer
  const builder = new NativeTransferBuilder();
  const transaction = builder
    .from(senderKey)
    .target(senderKey)
    .amount('100000000')
    .chainName('casper-test')
    .ttl(1800000)
    .payment(100000000)
    .buildFor1_5();

  // Sign
  transaction.sign(privateKey);

  // Get Deploy
  const deploy = transaction.getDeploy();

  console.log('=== DEPLOY JSON (via Deploy.toJSON) ===\n');
  const deployJson = Deploy.toJSON(deploy);
  console.log(JSON.stringify(deployJson, null, 2));

  console.log('\n\n=== CHECKING DEPLOY VALIDITY ===');
  console.log('Deploy hash:', deploy.hash?.toHex?.() || 'NO HASH');
  console.log('Has approvals:', deploy.approvals?.length || 0);
  console.log('Chain name:', deploy.header?.chainName);
  console.log('Timestamp:', deploy.header?.timestamp);
  console.log('TTL:', deploy.header?.ttl);
  console.log('Session type:', Object.keys(deployJson.session || {})[0]);
  console.log('Payment type:', Object.keys(deployJson.payment || {})[0]);

  console.log('\n\n=== RAW DEPLOY BYTES ===');
  const deployBytes = deploy.bytes();
  console.log('Byte length:', deployBytes.length);
  console.log('First 100 bytes (hex):');
  console.log(Array.from(deployBytes.slice(0, 100))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(''));
}

dumpDeployJson().catch(error => {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
