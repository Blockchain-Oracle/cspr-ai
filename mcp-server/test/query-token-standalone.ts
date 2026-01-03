/**
 * Standalone test script to verify Token contract queries work
 *
 * Phase 1: Evidence Gathering
 * - Query deployed Token contract using casper-js-sdk
 * - Verify we can read contract state
 * - Log exact RPC requests/responses
 *
 * Run with: npx tsx test/query-token-standalone.ts
 */

import casperSdk from "casper-js-sdk";
const { CasperServiceByJsonRPC, CLPublicKey } = casperSdk;

// Token contract deployed on testnet
const TOKEN_CONTRACT_HASH = "hash-810963e7e989ccc987683a2d1bcb4e17762f6511f06c306393dfd84c4db10995";
const RPC_URL = "https://node.testnet.cspr.cloud/rpc";

async function main() {
  console.log("=== Standalone Token Contract Query Test ===\n");
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Token Contract: ${TOKEN_CONTRACT_HASH}\n`);

  // Create RPC client using casper-js-sdk
  const casperService = new CasperServiceByJsonRPC(RPC_URL);

  try {
    // Step 1: Get latest state root hash
    console.log("Step 1: Getting state root hash...");
    const stateRootHash = await casperService.getStateRootHash();
    console.log(`State root hash: ${stateRootHash}\n`);

    // Step 2: Query the contract package hash directly
    console.log("Step 2: Querying contract package...");
    const contractPackageResult = await casperService.getBlockState(
      stateRootHash,
      TOKEN_CONTRACT_HASH,
      []
    );
    console.log("Contract package result:");
    console.log(JSON.stringify(contractPackageResult, null, 2));
    console.log();

    // Step 3: Check stored value type
    console.log("Step 3: Analyzing stored value type...");
    const storedValue = contractPackageResult.storedValue;
    const valueType = Object.keys(storedValue)[0];
    console.log(`Stored value type: ${valueType}`);
    console.log();

    // Step 4: Extract entity/contract hash if ContractPackage
    if (valueType === "ContractPackage") {
      console.log("Step 4: Extracting contract hash from ContractPackage...");
      const contractPackage = storedValue.ContractPackage;
      const versions = contractPackage.versions;
      console.log(`Found ${versions.length} version(s)`);

      const latestVersion = versions[versions.length - 1];
      const contractHash = latestVersion.contract_hash;
      console.log(`Latest contract hash: ${contractHash}\n`);

      // Step 5: Query the actual contract
      console.log("Step 5: Querying actual contract for named keys...");
      const contractResult = await casperService.getBlockState(
        stateRootHash,
        `hash-${contractHash.replace(/^hash-/, "")}`,
        []
      );
      console.log("Contract result:");
      console.log(JSON.stringify(contractResult, null, 2));
      console.log();

      // Step 6: Extract named keys
      console.log("Step 6: Extracting named keys...");
      const contractData = contractResult.storedValue;
      const contractValueType = Object.keys(contractData)[0];
      console.log(`Contract stored value type: ${contractValueType}`);

      const namedKeys = contractData[contractValueType]?.namedKeys || [];
      console.log(`Found ${namedKeys.length} named keys:`);
      namedKeys.forEach((nk: any) => {
        console.log(`  - ${nk.name}: ${nk.key}`);
      });
      console.log();

      // Step 7: Query specific named keys (token metadata)
      console.log("Step 7: Querying token metadata...");
      const keysToQuery = ["name", "symbol", "decimals", "total_supply"];

      for (const keyName of keysToQuery) {
        try {
          const result = await casperService.getBlockState(
            stateRootHash,
            `hash-${contractHash.replace(/^hash-/, "")}`,
            [keyName]
          );
          console.log(`${keyName}:`, JSON.stringify(result.storedValue, null, 2));
        } catch (error) {
          console.error(`Failed to query ${keyName}:`, error);
        }
      }
    } else if (valueType === "AddressableEntity" || valueType === "SmartContract") {
      console.log("Step 4: Casper 2.0 entity format detected");
      console.log("Entity data:");
      console.log(JSON.stringify(storedValue[valueType], null, 2));
    } else {
      console.log(`Unexpected stored value type: ${valueType}`);
      console.log("Full stored value:");
      console.log(JSON.stringify(storedValue, null, 2));
    }

    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("\n!!! ERROR !!!");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

main();
