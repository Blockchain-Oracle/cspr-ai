/**
 * Transaction format utilities for frontend wallet integration
 *
 * MCP tools output unsigned deploy JSON that CSPR.click wallet can sign directly.
 * No complex conversion needed - just pass through the JSON.
 */

/**
 * SDK-produced transaction JSON structure (from MCP tools)
 */
export interface SdkTransactionJson {
  hash?: string;
  header: {
    account: string;
    body_hash?: string;
    chain_name: string;
    dependencies?: string[];
    gas_price: number;
    timestamp?: string;
    ttl: string;
  };
  payment: {
    module_bytes?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown; bytes?: string }]>;
    };
    ModuleBytes?: {
      args: Array<[string, { parsed: unknown; cl_type: unknown; bytes?: string }]>;
    };
  };
  session: {
    transfer?: object;
    Transfer?: object;
    stored_contract_by_hash?: object;
    StoredContractByHash?: object;
    stored_contract_by_name?: object;
    StoredContractByName?: object;
    module_bytes?: object;
    ModuleBytes?: object;
  };
  approvals?: Array<{ signer: string; signature: string }>;
}

/**
 * Convert MCP unsigned deploy to format for CSPR.click wallet
 *
 * CSPR.click expects Deploy JSON format. MCP tools already output
 * compatible JSON, so we just pass it through with minimal normalization.
 */
export function convertToDeployFormat(unsignedTransaction: object): object {
  // MCP output is already in the correct format for CSPR.click
  // Just return it directly - no complex reconstruction needed
  return unsignedTransaction;
}

/**
 * Check if an unsigned transaction needs format conversion
 * (Kept for backwards compatibility but always returns false now)
 */
export function needsConversion(unsignedTransaction: unknown): boolean {
  return false;
}
