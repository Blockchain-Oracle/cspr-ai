#!/usr/bin/env node
/**
 * Deploy Odra contracts to Casper testnet using casper-js-sdk
 */

import { Casper Client, DeployUtil, CLPublicKey, CLValueBuilder, RuntimeArgs } from 'casper-js-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const NODE_ADDRESS = 'https://node.testnet.cspr.cloud/rpc';
const API_KEY = '019b4884-c00b-784d-89d7-fd77fc97c644';
const CHAIN_NAME = 'casper-test';
const SECRET_KEY_PATH = '/tmp/mcp_wallet_secret_key.pem';
const PAYMENT_AMOUNT = 200_000_000_000; // 200 CSPR in motes

// Contract configurations
const CONTRACTS = {
  token: {
    name: 'Cep18Token',
    wasm: path.join(__dirname, 'wasm/Cep18Token.wasm'),
    args: {
      name: 'CSPR.AI Token',
      symbol: 'CAIT',
      decimals: 9,
      initial_supply: '1000000000'
    }
  },
  nft: {
    name: 'NftCollection',
    wasm: path.join(__dirname, 'wasm/NftCollection.wasm'),
    args: {
      name: 'CSPR.AI NFT Collection',
      symbol: 'CAINFT',
      base_uri: 'https://api.cspr.ai/nft/metadata/',
      max_supply: '10000',
      minting_mode: 'Restricted' // enum value
    }
  },
  dao: {
    name: 'GovernanceDAO',
    wasm: path.join(__dirname, 'wasm/GovernanceDAO.wasm'),
    args: {
      token_name: 'CSPR.AI DAO Token',
      token_symbol: 'CAID',
      initial_supply: '10000000000',
      voting_period_ms: (7 * 24 * 60 * 60 * 1000).toString(), // 7 days
      proposal_threshold: '100000',
      quorum: '500000'
    }
  },
  dex: {
    name: 'CsprAiDEX',
    wasm: path.join(__dirname, 'wasm/CsprAiDEX.wasm'),
    args: {
      default_fee_bps: 30 // 0.3% fee
    }
  }
};

// Load secret key
function loadSecretKey() {
  const keyPair = Keys.Ed25519.parseKeyFiles(
    SECRET_KEY_PATH,
    SECRET_KEY_PATH
  );
  return keyPair;
}

// Build deploy for contract
function buildDeploy(contractName, config, keyPair) {
  console.log(`\n📝 Building deploy for ${contractName}...`);

  // Load WASM
  const wasmBytes = fs.readFileSync(config.wasm);

  // Build runtime args based on contract type
  let runtimeArgs;

  if (contractName === 'token') {
    runtimeArgs = RuntimeArgs.fromMap({
      name: CLValueBuilder.string(config.args.name),
      symbol: CLValueBuilder.string(config.args.symbol),
      decimals: CLValueBuilder.u8(config.args.decimals),
      initial_supply: CLValueBuilder.u256(config.args.initial_supply)
    });
  } else if (contractName === 'nft') {
    runtimeArgs = RuntimeArgs.fromMap({
      name: CLValueBuilder.string(config.args.name),
      symbol: CLValueBuilder.string(config.args.symbol),
      base_uri: CLValueBuilder.string(config.args.base_uri),
      max_supply: CLValueBuilder.u256(config.args.max_supply),
      minting_mode: CLValueBuilder.string(config.args.minting_mode)
    });
  } else if (contractName === 'dao') {
    runtimeArgs = RuntimeArgs.fromMap({
      token_name: CLValueBuilder.string(config.args.token_name),
      token_symbol: CLValueBuilder.string(config.args.token_symbol),
      initial_supply: CLValueBuilder.u256(config.args.initial_supply),
      voting_period_ms: CLValueBuilder.u64(config.args.voting_period_ms),
      proposal_threshold: CLValueBuilder.u256(config.args.proposal_threshold),
      quorum: CLValueBuilder.u256(config.args.quorum)
    });
  } else if (contractName === 'dex') {
    runtimeArgs = RuntimeArgs.fromMap({
      default_fee_bps: CLValueBuilder.u32(config.args.default_fee_bps)
    });
  }

  // Create deploy
  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(
      CLPublicKey.fromHex(keyPair.publicKey.toHex()),
      CHAIN_NAME,
      1, // gas price
      1800000 // ttl: 30 minutes
    ),
    DeployUtil.ExecutableDeployItem.newModuleBytes(
      wasmBytes,
      runtimeArgs
    ),
    DeployUtil.standardPayment(PAYMENT_AMOUNT)
  );

  // Sign deploy
  const signedDeploy = DeployUtil.signDeploy(deploy, keyPair);

  return signedDeploy;
}

// Deploy contract
async function deployContract(contractName, config) {
  console.log(`\n🚀 Deploying ${config.name}...`);

  try {
    // Load key pair
    const keyPair = loadSecretKey();

    // Build deploy
    const signedDeploy = buildDeploy(contractName, config, keyPair);

    // Create client with custom headers
    const client = new CasperClient(NODE_ADDRESS);

    // Add authorization header (need to patch the HTTP client)
    const originalPut = client.nodeClient.putDeploy.bind(client.nodeClient);
    client.nodeClient.putDeploy = async (deploy) => {
      // Inject authorization header
      const headers = { 'Authorization': API_KEY };
      return originalPut(deploy, headers);
    };

    // Submit deploy
    const deployHash = await client.putDeploy(signedDeploy);

    console.log(`✅ Deploy submitted!`);
    console.log(`   Deploy hash: ${deployHash}`);
    console.log(`   Explorer: https://testnet.cspr.live/deploy/${deployHash}`);

    return deployHash;

  } catch (error) {
    console.error(`❌ Deployment failed:`, error.message);
    throw error;
  }
}

// Main deployment function
async function main() {
  const contractToDeploy = process.argv[2];

  if (!contractToDeploy || !CONTRACTS[contractToDeploy]) {
    console.log('Usage: node deploy.mjs <contract>');
    console.log('\nAvailable contracts:');
    Object.keys(CONTRACTS).forEach(name => {
      console.log(`  - ${name}: ${CONTRACTS[name].name}`);
    });
    process.exit(1);
  }

  console.log(`\n🎯 Deploying ${CONTRACTS[contractToDeploy].name} to Casper testnet`);
  console.log(`   Chain: ${CHAIN_NAME}`);
  console.log(`   Node: ${NODE_ADDRESS}`);

  try {
    const deployHash = await deployContract(contractToDeploy, CONTRACTS[contractToDeploy]);
    console.log(`\n✨ Deployment complete! Deploy hash: ${deployHash}`);
  } catch (error) {
    console.error('\n💥 Deployment failed:', error);
    process.exit(1);
  }
}

main();
