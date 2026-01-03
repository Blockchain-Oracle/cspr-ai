/**
 * Standalone test using casper-js-sdk to query Token contract
 *
 * Phase 1: Evidence Gathering - Using Official SDK Patterns
 * - Use RpcClient.queryLatestGlobalState() (not raw fetch!)
 * - Use typed StoredValue, ContractPackage, Contract classes
 * - Follow the pattern from casper-js-sdk documentation
 *
 * Run with: npx tsx test/query-token-sdk.ts
 */

import casperSdk from "casper-js-sdk";
import dotenv from "dotenv";

const { CasperClient, HttpHandler, RpcClient } = casperSdk;

// Load environment variables
dotenv.config();

// Token contract deployed on testnet
const TOKEN_CONTRACT_HASH = "hash-810963e7e989ccc987683a2d1bcb4e17762f6511f06c306393dfd84c4db10995";
const RPC_URL = "https://node.testnet.cspr.cloud/rpc";
const API_KEY = process.env.CSPR_CLOUD_API_KEY;

async function main() {
  console.log("=== Testing Token Query with Official casper-js-sdk ===\n");
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Token Contract: ${TOKEN_CONTRACT_HASH}`);
  console.log(`API Key: ${API_KEY ? 'Loaded from .env' : 'NOT FOUND - will fail!'}\n`);

  // Create RPC client using official SDK pattern
  const handler = new HttpHandler(RPC_URL);

  // Set API key for cspr.cloud authentication (following casper-client.ts pattern)
  if (API_KEY) {
    handler.setCustomHeaders({
      "Authorization": API_KEY
    });
  }

  const rpcClient = new RpcClient(handler);

  try {
    // Step 1: Query the contract package hash directly
    console.log("Step 1: Querying contract package using SDK...");
    const packageResult = await rpcClient.queryLatestGlobalState(
      TOKEN_CONTRACT_HASH,
      []
    );

    console.log("✓ Query successful!");
    console.log(`API Version: ${packageResult.apiVersion}`);
    console.log(`Block Header: ${packageResult.blockHeader ? 'Present' : 'Not present'}`);
    console.log();

    // Step 2: Check stored value type
    console.log("Step 2: Analyzing stored value type...");
    const storedValue = packageResult.storedValue;

    // StoredValue has many optional properties - find which one is set
    let valueType: string | null = null;
    if (storedValue.contractPackage) {
      valueType = "ContractPackage";
    } else if (storedValue.contract) {
      valueType = "Contract";
    } else if (storedValue.addressableEntity) {
      valueType = "AddressableEntity";
    } else if (storedValue.clValue) {
      valueType = "CLValue";
    }

    console.log(`Stored value type: ${valueType}\n`);

    // Step 3: Handle ContractPackage (Odra format)
    if (storedValue.contractPackage) {
      console.log("Step 3: Extracting contract hash from ContractPackage...");
      const contractPackage = storedValue.contractPackage;
      const versions = contractPackage.versions;

      console.log(`Found ${versions.length} version(s)`);

      if (versions.length === 0) {
        throw new Error("ContractPackage has no versions!");
      }

      const latestVersion = versions[versions.length - 1];
      const contractHash = latestVersion.contractHash;

      console.log(`Latest version: ${latestVersion.contractVersion}`);

      // ContractHash has a 'hash' property (Hash object) with toHex() method
      const contractHashHex = contractHash.hash.toHex();

      console.log(`Contract hash: ${contractHashHex}\n`);

      // Step 4: Query the actual contract for named keys
      console.log("Step 4: Querying actual contract for named keys...");
      const contractKey = `hash-${contractHashHex}`;
      const contractResult = await rpcClient.queryLatestGlobalState(
        contractKey,
        []
      );

      console.log("✓ Contract query successful!\n");

      // Step 5: Extract named keys
      console.log("Step 5: Extracting named keys...");
      const contractStoredValue = contractResult.storedValue;

      let namedKeys: any[] = [];
      if (contractStoredValue.contract) {
        namedKeys = contractStoredValue.contract.namedKeys || [];
        console.log(`Found Contract with ${namedKeys.length} named keys:`);
      } else if (contractStoredValue.addressableEntity) {
        namedKeys = contractStoredValue.addressableEntity.namedKeys || [];
        console.log(`Found AddressableEntity with ${namedKeys.length} named keys:`);
      }

      namedKeys.forEach((nk: any) => {
        console.log(`  - ${nk.name}: ${nk.key}`);
      });
      console.log();

      // Step 6: Query specific token metadata
      console.log("Step 6: Querying token metadata (name, symbol, decimals, total_supply)...");
      const keysToQuery = ["name", "symbol", "decimals", "total_supply"];

      for (const keyName of keysToQuery) {
        try {
          const result = await rpcClient.queryLatestGlobalState(
            contractKey,
            [keyName]
          );

          const value = result.storedValue;
          let displayValue = "Unknown";

          if (value.clValue) {
            // CLValue has a parsed value we can display
            displayValue = JSON.stringify(value.clValue);
          }

          console.log(`  ${keyName}: ${displayValue}`);
        } catch (error) {
          console.error(`  Failed to query ${keyName}:`, error instanceof Error ? error.message : error);
        }
      }
    } else if (storedValue.contract) {
      // Old deprecated format - contract hash points directly to Contract
      console.log("Step 3: Contract format (old/deprecated)");
      const contract = storedValue.contract;
      const namedKeys = contract.namedKeys || [];

      console.log(`Found ${namedKeys.length} named keys:`);
      namedKeys.forEach((nk: any) => {
        console.log(`  - ${nk.name}: ${nk.key}`);
      });
    } else if (storedValue.addressableEntity) {
      // Casper 2.0 AddressableEntity format
      console.log("Step 3: AddressableEntity format (Casper 2.0)");
      const entity = storedValue.addressableEntity;
      const namedKeys = entity.namedKeys || [];

      console.log(`Found ${namedKeys.length} named keys:`);
      namedKeys.forEach((nk: any) => {
        console.log(`  - ${nk.name}: ${nk.key}`);
      });
    } else {
      console.error(`Unexpected stored value type: ${valueType}`);
      console.error("Full stored value:", JSON.stringify(storedValue, null, 2));
    }

    console.log("\n=== Test Complete - SUCCESS ===");
  } catch (error) {
    console.error("\n!!! ERROR !!!");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();
