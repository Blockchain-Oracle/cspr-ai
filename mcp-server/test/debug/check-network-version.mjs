/**
 * Check Casper testnet version to understand if it's 1.5 or 2.0
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import { CasperClient } from './dist/services/casper-client.js';

const TESTNET_RPC = 'https://node.testnet.casper.network/rpc';

async function checkNetworkVersion() {
  console.log('=== CHECKING CASPER TESTNET VERSION ===\n');
  console.log(`RPC: ${TESTNET_RPC}\n`);

  const client = new CasperClient(TESTNET_RPC);

  try {
    // Get node status which includes version info
    const status = await client.rpcClient.getNodeStatus();

    console.log('Node Status:');
    console.log(JSON.stringify(status, null, 2));

    // Try to extract version info
    if (status.apiVersion) {
      console.log(`\nAPI Version: ${status.apiVersion}`);
    }
    if (status.buildVersion) {
      console.log(`Build Version: ${status.buildVersion}`);
    }
    if (status.protocolVersion) {
      console.log(`Protocol Version: ${status.protocolVersion}`);
    }

    console.log('\n=== ANALYSIS ===');
    console.log('Check the protocol version to determine:');
    console.log('  - 1.5.x = Deploy format (putDeploy RPC method)');
    console.log('  - 2.0.x = Transaction format (putTransaction RPC method)');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nTrying alternative method...');

    // Try making a raw RPC call to get status
    try {
      const response = await fetch(TESTNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'info_get_status',
          params: {},
          id: 1
        })
      });

      const data = await response.json();
      console.log('Raw RPC Response:');
      console.log(JSON.stringify(data, null, 2));
    } catch (rawError) {
      console.error('Raw RPC also failed:', rawError.message);
    }
  }
}

checkNetworkVersion().catch(error => {
  console.error('FAILED:', error.message);
  process.exit(1);
});
