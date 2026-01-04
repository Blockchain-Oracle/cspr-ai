/**
 * Contract Tools Utilities
 *
 * Shared utilities for building deploy structures and formatting
 * output for contract-related MCP tools.
 */

import {
  DEPLOY_TTL,
  GAS_PRICE,
  CONTRACT_PAYMENT_MOTES
} from "../constants.js";
import casperSdk from "casper-js-sdk";

const { PublicKey } = casperSdk;

// ============================================================================
// Types
// ============================================================================

/** Arguments for Casper contract calls */
export type ContractArg = [string, { cl_type: string; parsed?: unknown; bytes?: string }];

/** Header structure for unsigned deploys */
interface DeployHeader {
  account: string;
  chain_name: string;
  gas_price: number;
  ttl: string;
}

/** Payment structure for unsigned deploys */
interface DeployPayment {
  module_bytes: {
    args: ContractArg[];
  };
}

/** Session structure for stored contract calls */
interface StoredContractSession {
  stored_contract_by_hash: {
    hash: string;
    hash_type: 'package' | 'contract';  // Indicates if hash is from contract-package or hash address
    entry_point: string;
    args: ContractArg[];
  };
}

/** Session structure for module bytes (deployment) */
interface ModuleBytesSession {
  module_bytes: {
    module_bytes: string;
    args: ContractArg[];
  };
}

/** Full unsigned deploy for stored contracts */
export interface UnsignedStoredContractDeploy {
  header: DeployHeader;
  payment: DeployPayment;
  session: StoredContractSession;
}

/** Full unsigned deploy for contract deployment */
export interface UnsignedModuleBytesDeploy {
  header: DeployHeader;
  payment: DeployPayment;
  session: ModuleBytesSession;
}

// ============================================================================
// Public Key Validation
// ============================================================================

/**
 * Validate a Casper public key
 *
 * @param publicKey - The public key hex string to validate
 * @throws Error if the public key is invalid
 */
export function validatePublicKey(publicKey: string): void {
  PublicKey.fromHex(publicKey);
}

/**
 * Validate multiple Casper public keys
 *
 * @param publicKeys - Array of public key hex strings to validate
 * @throws Error if any public key is invalid
 */
export function validatePublicKeys(publicKeys: string[]): void {
  for (const key of publicKeys) {
    validatePublicKey(key);
  }
}

// ============================================================================
// Deploy Building Helpers
// ============================================================================

/**
 * Create a standard deploy header
 */
function createDeployHeader(account: string, chainName: string): DeployHeader {
  return {
    account,
    chain_name: chainName,
    gas_price: GAS_PRICE,
    ttl: DEPLOY_TTL
  };
}

/**
 * Create standard payment structure for contract calls
 * Uses numeric 'parsed' format for proper amount parsing
 * Contract calls need 3 CSPR (3,000,000,000 motes) for gas
 */
function createPayment(): DeployPayment {
  return {
    module_bytes: {
      args: [["amount", { cl_type: "U512", parsed: String(CONTRACT_PAYMENT_MOTES) }]]
    }
  };
}

/**
 * Build unsigned deploy for calling a stored contract
 *
 * @param account - The account public key (transaction signer)
 * @param chainName - The network chain name
 * @param contractAddress - The contract address (hash-...)
 * @param entryPoint - The entry point to call
 * @param args - The contract call arguments
 * @returns Unsigned deploy structure
 */
export function buildStoredContractDeploy(
  account: string,
  chainName: string,
  contractAddress: string,
  entryPoint: string,
  args: ContractArg[]
): UnsignedStoredContractDeploy {
  // Detect hash type from address format
  const isPackageHash = contractAddress.startsWith("contract-package-");
  const hash = contractAddress.replace("hash-", "").replace("contract-package-", "");

  return {
    header: createDeployHeader(account, chainName),
    payment: createPayment(),
    session: {
      stored_contract_by_hash: {
        hash,
        hash_type: isPackageHash ? 'package' : 'contract',
        entry_point: entryPoint,
        args
      }
    }
  };
}

/**
 * Build unsigned deploy for deploying a contract (module bytes)
 *
 * @param account - The deployer public key
 * @param chainName - The network chain name
 * @param args - The constructor arguments
 * @returns Unsigned deploy structure with WASM placeholder
 */
export function buildModuleBytesDeploy(
  account: string,
  chainName: string,
  args: ContractArg[]
): UnsignedModuleBytesDeploy {
  return {
    header: createDeployHeader(account, chainName),
    payment: createPayment(),
    session: {
      module_bytes: {
        module_bytes: "[WASM_BYTES_PLACEHOLDER]",
        args
      }
    }
  };
}

// ============================================================================
// Address Formatting
// ============================================================================

/**
 * Truncate an address for display
 *
 * @param address - The full address string
 * @param length - Number of characters to show (default 20)
 * @returns Truncated address with ellipsis
 */
export function truncateAddress(address: string, length: number = 20): string {
  if (address.length <= length) {
    return address;
  }
  return `${address.slice(0, length)}...`;
}

// ============================================================================
// Markdown Helpers
// ============================================================================

/**
 * Generate deployment next steps markdown
 */
export function getDeploymentNextSteps(): string {
  return `## Next Steps
1. This is an **unsigned deployment transaction**
2. **Compile the contract** from \`contracts/\` directory:
   \`\`\`bash
   cd contracts
   cargo odra build -b casper
   \`\`\`
3. Replace \`[WASM_BYTES_PLACEHOLDER]\` with actual WASM bytes
4. Sign with your wallet (CSPR.click)
5. Submit to network
6. Save the contract hash for future interactions`;
}

/**
 * Generate transaction next steps markdown
 */
export function getTransactionNextSteps(): string {
  return `## Next Steps
1. This is an **unsigned transaction**
2. Sign with CSPR.click or another wallet
3. Submit the signed transaction to the network`;
}

/**
 * Format JSON as markdown code block
 */
export function jsonCodeBlock(obj: unknown): string {
  return `\`\`\`json
${JSON.stringify(obj, null, 2)}
\`\`\``;
}

// ============================================================================
// Environment Helpers
// ============================================================================

/**
 * Get contract address from environment variable
 * Preserves contract-package- or hash- prefix for proper handling
 *
 * @param envVarName - Environment variable name (e.g., 'CASPER_TOKEN_CONTRACT_ADDRESS')
 * @returns Contract address with original prefix, or null if not configured
 */
export function getContractFromEnv(envVarName: string): string | null {
  const address = process.env[envVarName];
  if (!address) return null;

  // Preserve contract-package- prefix (used for byPackageHash calls)
  if (address.startsWith('contract-package-')) {
    return address;
  }

  // Already in hash-xxx format
  if (address.startsWith('hash-')) {
    return address;
  }

  // Raw hash without prefix - add hash- prefix
  return `hash-${address}`;
}
