import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { CasperClient } from './dist/services/casper-client.js';

const RPC_URL = 'https://node.testnet.casper.network/rpc';
const client = new CasperClient(RPC_URL);

const txHash = '60d955646189447044993c8ab2cbde62a04ac049b03f394d4574b898fe36a0f2'; // DAO Vote - failed with error 1

console.log('Checking transaction details...');
const result = await client.getTransaction(txHash);
console.log(JSON.stringify(result, null, 2));
