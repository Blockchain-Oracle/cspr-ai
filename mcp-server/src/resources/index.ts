/**
 * MCP Resources for CSPR.AI
 *
 * Resources expose static data and documentation that AI agents can read.
 * Think of these as "files" that the AI can access for context.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register all MCP resources with the server
 */
export function registerAllResources(server: McpServer): void {
  // Contract ABIs and interfaces
  registerContractResources(server);

  // Example transactions and usage guides
  registerExampleResources(server);

  // Network information and constants
  registerNetworkResources(server);

  console.error("✓ Registered MCP resources");
}

/**
 * Register contract ABI and interface resources
 */
function registerContractResources(server: McpServer): void {
  // CEP-18 Token Standard
  server.registerResource(
    "cep18-token",
    "casper://contracts/cep18-token",
    {
      title: "CEP-18 Token Contract",
      description: "Casper fungible token standard (like ERC-20). Supports transfer, approve, transferFrom, mint, and burn operations.",
      mimeType: "application/json"
    },
    async (uri: URL) => {
      const abi = {
        name: "CEP-18 Token",
        standard: "CEP-18",
        methods: {
          transfer: {
            args: ["recipient: Address", "amount: U256"],
            returns: "void",
            description: "Transfer tokens to another address"
          },
          approve: {
            args: ["spender: Address", "amount: U256"],
            returns: "void",
            description: "Approve another address to spend tokens"
          },
          transfer_from: {
            args: ["owner: Address", "recipient: Address", "amount: U256"],
            returns: "void",
            description: "Transfer tokens on behalf of owner (requires approval)"
          },
          balance_of: {
            args: ["owner: Address"],
            returns: "U256",
            description: "Get token balance of an address"
          },
          total_supply: {
            args: [],
            returns: "U256",
            description: "Get total token supply"
          },
          name: {
            args: [],
            returns: "String",
            description: "Get token name"
          },
          symbol: {
            args: [],
            returns: "String",
            description: "Get token symbol"
          },
          decimals: {
            args: [],
            returns: "u8",
            description: "Get token decimals"
          }
        },
        events: {
          Transfer: {
            fields: ["from: Option<Address>", "to: Option<Address>", "amount: U256"],
            description: "Emitted when tokens are transferred"
          },
          Approval: {
            fields: ["owner: Address", "spender: Address", "amount: U256"],
            description: "Emitted when approval is granted"
          }
        }
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(abi, null, 2)
        }]
      };
    }
  );

  // CEP-78 NFT Standard
  server.registerResource(
    "cep78-nft",
    "casper://contracts/cep78-nft",
    {
      title: "CEP-78 NFT Contract",
      description: "Casper NFT standard (like ERC-721). Supports minting, transfers, approvals, and metadata URIs.",
      mimeType: "application/json"
    },
    async (uri: URL) => {
      const abi = {
        name: "CEP-78 NFT",
        standard: "CEP-78",
        methods: {
          mint: {
            args: ["recipient: Address", "name: String", "metadata_uri: String"],
            returns: "U256 (token_id)",
            description: "Mint a new NFT to recipient"
          },
          transfer_from: {
            args: ["from: Address", "to: Address", "token_id: U256"],
            returns: "void",
            description: "Transfer NFT from one address to another"
          },
          approve: {
            args: ["to: Address", "token_id: U256"],
            returns: "void",
            description: "Approve another address to transfer specific NFT"
          },
          owner_of: {
            args: ["token_id: U256"],
            returns: "Address",
            description: "Get owner of an NFT"
          },
          token_uri: {
            args: ["token_id: U256"],
            returns: "String",
            description: "Get metadata URI for an NFT"
          },
          balance_of: {
            args: ["owner: Address"],
            returns: "U256",
            description: "Get number of NFTs owned by address"
          },
          total_supply: {
            args: [],
            returns: "U256",
            description: "Get total number of NFTs minted"
          }
        },
        events: {
          Transfer: {
            fields: ["from: Option<Address>", "to: Option<Address>", "token_id: U256"],
            description: "Emitted when NFT is transferred"
          },
          Approval: {
            fields: ["owner: Address", "approved: Option<Address>", "token_id: U256"],
            description: "Emitted when approval is granted/revoked"
          },
          NFTMinted: {
            fields: ["token_id: U256", "recipient: Address", "metadata_uri: String"],
            description: "Emitted when new NFT is minted"
          }
        }
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(abi, null, 2)
        }]
      };
    }
  );

  // DAO Governance Contract
  server.registerResource(
    "dao-governance",
    "casper://contracts/dao-governance",
    {
      title: "DAO Governance Contract",
      description: "On-chain governance with proposal creation, voting, and execution. Uses snapshot-based voting (no token locking).",
      mimeType: "application/json"
    },
    async (uri: URL) => {
      const abi = {
        name: "DAO Governance",
        type: "Custom",
        methods: {
          create_proposal: {
            args: ["description: String", "action: ProposalAction"],
            returns: "u64 (proposal_id)",
            description: "Create a new governance proposal"
          },
          vote: {
            args: ["proposal_id: u64", "support: bool", "amount: U256"],
            returns: "void",
            description: "Vote on a proposal (snapshot-based, no token lock)"
          },
          execute: {
            args: ["proposal_id: u64"],
            returns: "void",
            description: "Execute a passed proposal after voting period"
          },
          get_proposal: {
            args: ["proposal_id: u64"],
            returns: "Proposal",
            description: "Get proposal details"
          },
          get_vote: {
            args: ["proposal_id: u64", "voter: Address"],
            returns: "Option<Vote>",
            description: "Get vote record for a voter on a proposal"
          }
        },
        proposal_actions: {
          MintTokens: {
            fields: ["recipient: Address", "amount: U256"],
            description: "Mint governance tokens to an address"
          },
          TransferTokens: {
            fields: ["recipient: Address", "amount: U256"],
            description: "Transfer tokens from DAO treasury"
          },
          UpdateParameter: {
            fields: ["parameter: String", "value: U256"],
            description: "Update DAO parameters (quorum, voting period, etc.)"
          }
        },
        voting_mechanism: "Snapshot-based (voting power = token balance at vote time, no locking)"
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(abi, null, 2)
        }]
      };
    }
  );

  // DEX AMM Contract
  server.registerResource(
    "dex-amm",
    "casper://contracts/dex-amm",
    {
      title: "DEX AMM Contract",
      description: "Automated market maker (AMM) with constant product formula (x * y = k). Supports liquidity provision and token swaps.",
      mimeType: "application/json"
    },
    async (uri: URL) => {
      const abi = {
        name: "DEX AMM",
        type: "Custom",
        formula: "Constant Product (x * y = k)",
        methods: {
          create_pool: {
            args: ["token_a: Address", "token_b: Address"],
            returns: "u64 (pool_id)",
            description: "Create a new liquidity pool for two tokens"
          },
          add_liquidity: {
            args: ["pool_id: u64", "amount_a: U256", "amount_b: U256", "min_liquidity: U256"],
            returns: "U256 (lp_tokens_minted)",
            description: "Add liquidity to a pool and receive LP tokens"
          },
          remove_liquidity: {
            args: ["pool_id: u64", "liquidity: U256", "min_amount_a: U256", "min_amount_b: U256"],
            returns: "(U256, U256) (amounts returned)",
            description: "Remove liquidity and burn LP tokens"
          },
          swap_exact_tokens_for_tokens: {
            args: ["pool_id: u64", "token_in: Address", "amount_in: U256", "min_amount_out: U256"],
            returns: "U256 (amount_out)",
            description: "Swap exact input amount for output tokens"
          },
          get_reserves: {
            args: ["pool_id: u64"],
            returns: "(U256, U256) (reserve_a, reserve_b)",
            description: "Get current pool reserves"
          },
          get_amount_out: {
            args: ["amount_in: U256", "reserve_in: U256", "reserve_out: U256"],
            returns: "U256",
            description: "Calculate output amount for a given input (includes fees)"
          }
        },
        fee_structure: "0.3% swap fee (30 basis points) - configurable per pool",
        slippage_protection: "All swap/liquidity functions include min_amount parameters"
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(abi, null, 2)
        }]
      };
    }
  );
}

/**
 * Register example transaction and usage guide resources
 */
function registerExampleResources(server: McpServer): void {
  // Example: Token Transfer
  server.registerResource(
    "token-transfer-example",
    "casper://examples/token-transfer",
    {
      title: "Token Transfer Example",
      description: "Complete example of transferring CEP-18 tokens between addresses",
      mimeType: "text/markdown"
    },
    async (uri: URL) => {
      const example = `# Token Transfer Example

## Scenario
Alice wants to send 100 CSPRAI tokens to Bob.

## Prerequisites
- Alice's public key: 01a1b2c3...
- Bob's public key: 01d4e5f6...
- Token contract address: hash-abc123...
- Alice has sufficient token balance (≥100 tokens)

## Steps

### 1. Check Alice's Balance
\`\`\`typescript
// Using MCP tool
casper_get_tokens({
  account_hash: "01a1b2c3...",
  token_contract: "hash-abc123..."
})
// Returns: { balance: "500000000000", decimals: 9, symbol: "CSPRAI" }
// Actual balance: 500 CSPRAI (500000000000 / 10^9)
\`\`\`

### 2. Build Transfer Transaction
\`\`\`typescript
// Using MCP tool
casper_build_token_transfer({
  sender_public_key: "01a1b2c3...",
  recipient_public_key: "01d4e5f6...",
  amount_tokens: 100,
  token_contract: "hash-abc123..."
})
// Returns: unsigned_deploy {...}
\`\`\`

### 3. Sign with Wallet
User signs the unsigned deploy using CSPR.click wallet.

### 4. Submit Transaction
The signed deploy is submitted to the Casper network.

### 5. Verify Transfer
\`\`\`typescript
// Check Bob's new balance
casper_get_tokens({
  account_hash: "01d4e5f6...",
  token_contract: "hash-abc123..."
})
// Returns: { balance: "100000000000", decimals: 9, symbol: "CSPRAI" }
// Actual balance: 100 CSPRAI
\`\`\`

## Important Notes
- All token amounts are in smallest unit (like wei for Ethereum)
- 1 CSPRAI token = 1,000,000,000 base units (if decimals = 9)
- Gas fees are paid in CSPR (not the token being transferred)
- Transaction finality: ~2 minutes on Casper
`;

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: example
        }]
      };
    }
  );

  // Example: DAO Proposal Lifecycle
  server.registerResource(
    "dao-proposal-example",
    "casper://examples/dao-proposal",
    {
      title: "DAO Proposal Example",
      description: "Complete lifecycle of creating, voting on, and executing a DAO proposal",
      mimeType: "text/markdown"
    },
    async (uri: URL) => {
      const example = `# DAO Proposal Lifecycle Example

## Scenario
Community wants to mint 10,000 new governance tokens for ecosystem development.

## Steps

### 1. Create Proposal
\`\`\`typescript
// Proposer must hold minimum governance tokens (e.g., 100 tokens)
casper_dao_create_proposal({
  dao_contract: "hash-dao123...",
  proposer_public_key: "01proposer...",
  description: "Mint 10,000 tokens for ecosystem grants program",
  action: {
    type: "MintTokens",
    recipient: "01treasury...",
    amount: 10000
  }
})
// Returns: { proposal_id: 5, voting_ends_at: "2024-03-15T12:00:00Z" }
\`\`\`

### 2. Vote on Proposal
\`\`\`typescript
// Snapshot-based voting (uses token balance at vote time)
casper_dao_vote({
  dao_contract: "hash-dao123...",
  voter_public_key: "01voter...",
  proposal_id: 5,
  support: true,
  vote_weight: 500  // Voter's token balance
})
// Tokens are NOT locked - voting power = balance at vote time
\`\`\`

### 3. Wait for Voting Period
Voting period typically lasts 3-7 days. Monitor proposal status:

\`\`\`typescript
casper_dao_get_proposal({
  dao_contract: "hash-dao123...",
  proposal_id: 5
})
// Returns: {
//   description: "Mint 10,000 tokens...",
//   for_votes: "75000",
//   against_votes: "5000",
//   status: "Active",
//   ends_at: "2024-03-15T12:00:00Z"
// }
\`\`\`

### 4. Execute Proposal
After voting ends and quorum is met:

\`\`\`typescript
casper_dao_execute_proposal({
  dao_contract: "hash-dao123...",
  executor_public_key: "01anyone...",  // Anyone can execute
  proposal_id: 5
})
// If passed: Mints 10,000 tokens to treasury
// If failed: Proposal is marked as rejected
\`\`\`

## Voting Rules
- **Quorum**: Minimum total votes required (e.g., 10% of total supply)
- **Approval Threshold**: Usually >50% of votes must be "for"
- **Snapshot Voting**: Voting power = token balance when you vote (no locking)
- **Execution Delay**: Optional timelock (e.g., 24 hours) before execution

## Important Notes
- No tokens are locked during voting (snapshot-based system)
- Once voting ends, proposal cannot be changed
- Failed proposals can be recreated with modifications
- Execution requires proposal to be passed and voting period ended
`;

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: example
        }]
      };
    }
  );

  // Example: DEX Swap
  server.registerResource(
    "dex-swap-example",
    "casper://examples/dex-swap",
    {
      title: "DEX Swap Example",
      description: "Swapping tokens on the CSPR.AI DEX with slippage protection",
      mimeType: "text/markdown"
    },
    async (uri: URL) => {
      const example = `# DEX Token Swap Example

## Scenario
User wants to swap 100 USDC for CSPR using the DEX AMM.

## Steps

### 1. Check Pool Reserves
\`\`\`typescript
casper_dex_get_pool({
  dex_contract: "hash-dex123...",
  pool_id: 7  // USDC/CSPR pool
})
// Returns: {
//   token_a: "hash-usdc...",
//   token_b: "hash-cspr...",
//   reserve_a: "50000",  // 50,000 USDC
//   reserve_b: "1000000", // 1,000,000 CSPR
//   fee_bps: 30  // 0.3% fee
// }
\`\`\`

### 2. Calculate Expected Output
Use constant product formula with fees:
- Input: 100 USDC
- Fee: 100 * 0.003 = 0.3 USDC
- Input after fee: 99.7 USDC
- Expected output: ~1,990 CSPR (based on x*y=k)

### 3. Set Slippage Tolerance
User accepts 1% slippage:
- Minimum output: 1,990 * 0.99 = 1,970 CSPR

### 4. Execute Swap
\`\`\`typescript
casper_dex_swap({
  dex_contract: "hash-dex123...",
  trader_public_key: "01trader...",
  pool_id: 7,
  token_in: "hash-usdc...",
  amount_in: 100,
  min_amount_out: 1970  // Slippage protection
})
// Returns: {
//   amount_out: "1985",
//   price_impact: "0.25%",
//   fee_paid: "0.3 USDC"
// }
\`\`\`

### 5. Verify Balances
\`\`\`typescript
// Check new CSPR balance
casper_get_balance({
  public_key: "01trader..."
})
// Returns: { balance: "New balance + 1985 CSPR" }
\`\`\`

## Important Concepts

### Price Impact
Larger swaps cause bigger price changes:
- 100 USDC swap: 0.25% price impact
- 1,000 USDC swap: 2.5% price impact
- 10,000 USDC swap: 20% price impact (WARNING: high slippage!)

### Slippage Protection
Always set \`min_amount_out\` to protect against:
- Front-running attacks
- Price volatility during transaction
- Calculation errors

### Fees
- Swap fee: 0.3% (30 basis points)
- Fee goes to liquidity providers
- Fee is deducted from input amount

## Tips for Best Execution
1. **Check liquidity**: Larger pools = less price impact
2. **Split large trades**: Multiple smaller swaps may have less total slippage
3. **Monitor price**: Use real-time price feeds for accurate calculations
4. **Set reasonable slippage**: 0.5% for stablecoins, 1-2% for volatile pairs
`;

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: example
        }]
      };
    }
  );
}

/**
 * Register network information and constants
 */
function registerNetworkResources(server: McpServer): void {
  server.registerResource(
    "network-info",
    "casper://network/info",
    {
      title: "Casper Network Information",
      description: "Network details, RPC endpoints, explorers, and important constants",
      mimeType: "application/json"
    },
    async (uri: URL) => {
      const networkInfo = {
        networks: {
          testnet: {
            name: "casper-test",
            rpc_url: "https://node.testnet.cspr.cloud/rpc",
            explorer: "https://testnet.cspr.live",
            faucet: "https://testnet.cspr.live/tools/faucet",
            chain_id: "casper-test"
          },
          mainnet: {
            name: "casper",
            rpc_url: "https://node.cspr.cloud/rpc",
            explorer: "https://cspr.live",
            chain_id: "casper"
          }
        },
        constants: {
          motes_per_cspr: "1000000000",
          decimals: 9,
          min_transfer_amount: "2500000000",  // 2.5 CSPR
          min_delegation_amount: "500000000000",  // 500 CSPR
          block_time_seconds: 30,
          era_duration_seconds: 7200,  // ~2 hours
          unbonding_period_eras: 7  // ~14 hours
        },
        gas_costs: {
          native_transfer: "100000000",  // 0.1 CSPR
          erc20_transfer: "5000000000",  // 5 CSPR
          contract_deploy: "200000000000",  // 200 CSPR
          delegation: "2500000000"  // 2.5 CSPR
        },
        token_standards: {
          cep18: "Fungible tokens (like ERC-20)",
          cep78: "NFTs (like ERC-721)",
          cep47: "Legacy NFT standard (deprecated, use CEP-78)"
        },
        important_notes: {
          finality: "Transaction finality in ~2 minutes (4 blocks)",
          wallet_integration: "Use CSPR.click for signing transactions",
          unsigned_transactions: "All MCP write tools return unsigned deploys",
          account_format: "Public keys are hex-encoded with algorithm prefix (01 = Ed25519, 02 = Secp256k1)"
        }
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(networkInfo, null, 2)
        }]
      };
    }
  );
}
