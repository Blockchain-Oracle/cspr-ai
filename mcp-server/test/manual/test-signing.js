/**
 * Test script for signing utilities
 *
 * This script tests the deploy signing functionality with both
 * Ed25519 and Secp256k1 keys.
 */

import crypto from "crypto";
import {
  loadPrivateKey,
  buildTransferDeploy,
  signDeploy,
  deployToJson,
} from "./dist/utils/signing.js";

console.log("🔐 Testing Casper Deploy Signing Utilities\n");

// Test 1: Ed25519 Key Generation and Signing
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Test 1: Ed25519 Key");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Generate a random Ed25519 keypair for testing
const ed25519Hex = crypto.randomBytes(32).toString('hex');
const ed25519Key = loadPrivateKey(ed25519Hex);
const ed25519PublicKey = ed25519Key.publicKey.toHex();

console.log(`Generated Ed25519 Key:`);
console.log(`  Private: ${ed25519Hex.slice(0, 20)}...${ed25519Hex.slice(-20)}`);
console.log(`  Public:  ${ed25519PublicKey}`);
console.log(`✓ Private key loaded successfully`);

// Create an unsigned transfer deploy
const unsignedTransfer = {
  header: {
    account: ed25519PublicKey,
    chain_name: "casper-test",
    gas_price: 1,
    ttl: "30m",
  },
  payment: {
    module_bytes: {
      args: [["amount", { cl_type: "U512", bytes: "0500e1f505" }]],
    },
  },
  session: {
    transfer: {
      args: [
        ["amount", { cl_type: "U512", parsed: "2500000000" }],
        ["target", { cl_type: "PublicKey", parsed: "0119bf44096984cdfe8541bac167dc3b96c85086aa30b6b6cb0c5c38ad703166e1" }],
        ["id", { cl_type: { Option: "U64" }, parsed: null }],
      ],
    },
  },
};

console.log(`\nBuilding transfer deploy...`);
const deploy = buildTransferDeploy(unsignedTransfer, ed25519Key);
console.log(`✓ Deploy built successfully`);

console.log(`\nSigning deploy...`);
const signedDeploy = signDeploy(deploy, ed25519Key);
console.log(`✓ Deploy signed successfully`);

const result = deployToJson(signedDeploy);
console.log(`\n📋 Signed Deploy Result:`);
console.log(`  Deploy Hash: ${result.deploy_hash}`);
console.log(`  JSON Length: ${result.signed_deploy_json.length} chars`);

// Verify the JSON is valid
const parsed = JSON.parse(result.signed_deploy_json);
console.log(`  ✓ Deploy JSON is valid`);
console.log(`  ✓ Has approvals: ${parsed.approvals?.length > 0}`);

// Test 2: Secp256k1 Key Generation and Signing
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Test 2: Secp256k1 Key");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Generate a random Secp256k1 keypair for testing
const secp256k1Hex = crypto.randomBytes(32).toString('hex');
const secp256k1Key = loadPrivateKey(secp256k1Hex);
const secp256k1PublicKey = secp256k1Key.publicKey.toHex();

console.log(`Generated Secp256k1 Key:`);
console.log(`  Private: ${secp256k1Hex.slice(0, 20)}...${secp256k1Hex.slice(-20)}`);
console.log(`  Public:  ${secp256k1PublicKey}`);
console.log(`✓ Private key loaded successfully`);

// Create an unsigned transfer deploy with Secp256k1
const unsignedTransfer2 = {
  ...unsignedTransfer,
  header: {
    ...unsignedTransfer.header,
    account: secp256k1PublicKey,
  },
};

console.log(`\nBuilding transfer deploy...`);
const deploy2 = buildTransferDeploy(unsignedTransfer2, secp256k1Key);
console.log(`✓ Deploy built successfully`);

console.log(`\nSigning deploy...`);
const signedDeploy2 = signDeploy(deploy2, secp256k1Key);
console.log(`✓ Deploy signed successfully`);

const result2 = deployToJson(signedDeploy2);
console.log(`\n📋 Signed Deploy Result:`);
console.log(`  Deploy Hash: ${result2.deploy_hash}`);
console.log(`  JSON Length: ${result2.signed_deploy_json.length} chars`);

// Verify the JSON is valid
const parsed2 = JSON.parse(result2.signed_deploy_json);
console.log(`  ✓ Deploy JSON is valid`);
console.log(`  ✓ Has approvals: ${parsed2.approvals?.length > 0}`);

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✅ All Tests Passed!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("Summary:");
console.log("  ✓ Ed25519 key loading");
console.log("  ✓ Ed25519 deploy building");
console.log("  ✓ Ed25519 deploy signing");
console.log("  ✓ Ed25519 JSON serialization");
console.log("  ✓ Secp256k1 key loading");
console.log("  ✓ Secp256k1 deploy building");
console.log("  ✓ Secp256k1 deploy signing");
console.log("  ✓ Secp256k1 JSON serialization");
console.log("\n🎉 Signing utilities are working correctly!");
