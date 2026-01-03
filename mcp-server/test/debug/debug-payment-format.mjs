/**
 * Debug Payment Format Differences
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import casperSdk from 'casper-js-sdk';
const { PublicKey, NativeTransferBuilder, ContractCallBuilder, Args, CLValue } = casperSdk;

import { getSecretKeyFromEnv, loadPrivateKey } from './dist/utils/signing.js';

const secretKey = getSecretKeyFromEnv();
const privateKey = loadPrivateKey(secretKey);
const publicKey = privateKey.publicKey;
const CHAIN_NAME = 'casper-test';

console.log('=== Payment Format Comparison ===\n');

// 1. Working Native Transfer
const transfer = new NativeTransferBuilder()
  .from(publicKey)
  .target(PublicKey.fromHex('0203c66be5841280cf90056d09c3e7ab6449cc4042cfaaeed7b6de67c2ae3d519c92'))
  .amount('10000000000')
  .id(Date.now())
  .chainName(CHAIN_NAME)
  .ttl(30 * 60 * 1000)
  .payment(100_000_000)
  .build();

console.log('--- Native Transfer (WORKING) ---');
const transferJson = transfer.toJSON();
console.log('Payment:', JSON.stringify(transferJson.payload.fields[1], null, 2));
console.log();

// 2. Contract Call
const contractCall = new ContractCallBuilder()
  .byPackageHash('91083a42df41a577f2d5695ad4c78f799dc1d3016eccef4ce2a6f9a43c68506f', null)
  .from(publicKey)
  .entryPoint('propose')
  .chainName(CHAIN_NAME)
  .runtimeArgs(Args.fromMap({
    description: CLValue.newCLString('Test')
  }))
  .ttl(30 * 60 * 1000)
  .payment(300_000_000)
  .build();

console.log('--- Contract Call ---');
const contractJson = contractCall.toJSON();
console.log('Payment:', JSON.stringify(contractJson.payload.fields[1], null, 2));
console.log();

console.log('--- Full Transfer JSON ---');
console.log(JSON.stringify(transferJson, null, 2));
console.log();

console.log('--- Full Contract Call JSON ---');
console.log(JSON.stringify(contractJson, null, 2));
