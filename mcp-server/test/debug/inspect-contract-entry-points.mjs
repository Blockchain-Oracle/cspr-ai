/**
 * Inspect Contract Entry Points
 *
 * Query the actual deployed contracts to see what entry points they have
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import casperSdk from 'casper-js-sdk';
const { CasperServiceByJsonRPC } = casperSdk;

const RPC_URL = 'https://node.testnet.casper.network/rpc';
const casperService = new CasperServiceByJsonRPC(RPC_URL);

function extractHash(contractAddress) {
  if (contractAddress.startsWith('contract-package-')) {
    return contractAddress.replace('contract-package-', '');
  }
  if (contractAddress.startsWith('hash-')) {
    return contractAddress.replace('hash-', '');
  }
  return contractAddress;
}

const DAO_CONTRACT = extractHash(process.env.CASPER_DAO_CONTRACT_ADDRESS);
const NFT_CONTRACT = extractHash(process.env.CASPER_NFT_CONTRACT_ADDRESS);
const TOKEN_CONTRACT = extractHash(process.env.CASPER_TOKEN_CONTRACT_ADDRESS);
const DEX_CONTRACT = extractHash(process.env.CASPER_DEX_CONTRACT_ADDRESS);

console.log('=== Inspecting Contract Entry Points ===\n');

async function getContractEntryPoints(contractHash, name) {
  try {
    console.log(`--- ${name} ---`);
    console.log('Contract Hash:', contractHash);

    // Try to get state root hash first
    const stateRootHash = await casperService.getStateRootHash();
    console.log('State Root Hash:', stateRootHash);

    // Query contract package
    const contractPackageHash = `contract-package-${contractHash}`;
    const result = await casperService.getBlockState(
      stateRootHash,
      contractPackageHash,
      []
    );

    console.log('\nContract Package Data:');
    console.log(JSON.stringify(result, null, 2));

    if (result?.ContractPackage) {
      const contractPackage = result.ContractPackage;
      console.log('\nVersions:');
      if (contractPackage.versions) {
        for (const version of contractPackage.versions) {
          console.log(`  Version ${version.protocol_version_major}: contract-${version.contract_hash}`);
        }
      }

      // Get the latest version's contract
      if (contractPackage.versions && contractPackage.versions.length > 0) {
        const latestVersion = contractPackage.versions[contractPackage.versions.length - 1];
        const contractHash = latestVersion.contract_hash;

        console.log(`\nQuerying latest contract: contract-${contractHash}`);
        const contractResult = await casperService.getBlockState(
          stateRootHash,
          `contract-${contractHash}`,
          []
        );

        if (contractResult?.Contract) {
          console.log('\nEntry Points:');
          const entryPoints = contractResult.Contract.entry_points;
          if (entryPoints && entryPoints.length > 0) {
            entryPoints.forEach(ep => {
              console.log(`  - ${ep.name} (${ep.entry_point_type})`);
            });
          } else {
            console.log('  No entry points found!');
          }
        } else {
          console.log('Could not retrieve contract data');
          console.log(JSON.stringify(contractResult, null, 2));
        }
      }
    } else {
      console.log('Not a contract package or data not available');
    }

    console.log('\n');
  } catch (error) {
    console.log(`Error inspecting ${name}:`, error.message);
    console.log('\n');
  }
}

// Inspect all contracts
await getContractEntryPoints(DAO_CONTRACT, 'DAO Contract');
await getContractEntryPoints(NFT_CONTRACT, 'NFT Contract');
await getContractEntryPoints(TOKEN_CONTRACT, 'Token Contract');
await getContractEntryPoints(DEX_CONTRACT, 'DEX Contract');
