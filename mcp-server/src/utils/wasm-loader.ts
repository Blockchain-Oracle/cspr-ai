/**
 * WASM Loader Utility
 *
 * Loads pre-compiled contract WASM files for deployment.
 * These WASM files are compiled from the contracts/ directory using Odra.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Contract types we support
export type ContractType = "token" | "nft" | "dao" | "dex";

// WASM file names for each contract type
const WASM_FILES: Record<ContractType, string> = {
  token: "Cep18Token.wasm",
  nft: "NftCollection.wasm",
  dao: "GovernanceDAO.wasm",
  dex: "CsprAiDEX.wasm",
};

// Cache loaded WASM bytes
const wasmCache: Map<ContractType, Uint8Array> = new Map();

/**
 * Get the path to the contracts/wasm directory
 */
function getWasmDir(): string {
  // Navigate from mcp-server/src/utils to contracts/wasm
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Go up from utils -> src -> mcp-server -> casper, then into contracts/wasm
  return join(currentDir, "..", "..", "..", "..", "contracts", "wasm");
}

/**
 * Load WASM bytes for a contract type
 *
 * @param contractType - The type of contract to load
 * @returns Uint8Array of WASM bytes
 * @throws Error if WASM file not found
 */
export function loadContractWasm(contractType: ContractType): Uint8Array {
  // Check cache first
  const cached = wasmCache.get(contractType);
  if (cached) {
    return cached;
  }

  const wasmDir = getWasmDir();
  const wasmFile = WASM_FILES[contractType];
  const wasmPath = join(wasmDir, wasmFile);

  if (!existsSync(wasmPath)) {
    throw new Error(
      `WASM file not found: ${wasmPath}. ` +
      `Please compile contracts with: cd contracts && cargo odra build -b casper`
    );
  }

  // Read the WASM file as a Buffer and convert to Uint8Array
  const buffer = readFileSync(wasmPath);
  const wasmBytes = new Uint8Array(buffer);

  // Cache for future use
  wasmCache.set(contractType, wasmBytes);

  return wasmBytes;
}

/**
 * Check if WASM is available for a contract type
 */
export function isWasmAvailable(contractType: ContractType): boolean {
  try {
    const wasmDir = getWasmDir();
    const wasmFile = WASM_FILES[contractType];
    const wasmPath = join(wasmDir, wasmFile);
    return existsSync(wasmPath);
  } catch {
    return false;
  }
}

/**
 * Get WASM file size for a contract type (for display purposes)
 */
export function getWasmSize(contractType: ContractType): number {
  const wasm = loadContractWasm(contractType);
  return wasm.length;
}
