<h1 align="center"><img src="../assets/logo.svg" alt="CSPR.AI" height="40" style="vertical-align: middle;" /> Smart Contracts</h1>

<p align="center">
  Smart contracts for the CSPR.AI platform built with the <a href="https://odra.dev">Odra Framework</a> for Casper Network.
</p>

## 🦀 Built with Odra Framework

**All CSPR.AI smart contracts are built using the [Odra Framework](https://odra.dev)** - a type-safe, developer-friendly Rust framework for Casper Network.

| **Odra Feature** | **How We Use It** | **Benefit** |
|-----------------|-------------------|-------------|
| 🧩 **odra-modules** | Reusable CEP-18 and Ownable modules | No need to reinvent standards |
| 🛠️ **OdraVM Testing** | Fast in-memory tests | Quick iteration during development |
| ⚡ **CasperVM Testing** | Production-accurate validation | Ensures contracts work on real network |
| 📝 **Odra CLI** | `cargo odra build` / `cargo odra test` | Streamlined development workflow |
| 🔒 **Type Safety** | Rust's type system | Catch bugs at compile time |

### Casper Standards Implemented

- ✅ **CEP-18** - Fungible tokens via `SubModule<Cep18>`
- ✅ **CEP-78 Compatible** - NFT collections with metadata
- ✅ **Access Control** - `SubModule<Ownable>` for admin functions

## Architecture

```
contracts/
├── src/
│   ├── lib.rs       # Module exports
│   ├── token.rs     # CEP-18 Fungible Token
│   ├── nft.rs       # NFT Collection (CEP-78 compatible)
│   ├── dao.rs       # Governance DAO
│   └── dex.rs       # AMM DEX
├── bin/
│   ├── build_contract.rs    # WASM build script
│   └── deploy_on_livenet.rs # Deployment script
├── Cargo.toml       # Rust dependencies
└── Odra.toml        # Odra configuration
```

## Contracts

### CEP-18 Token (`Cep18Token`)
Standard fungible token following CEP-18 specification.

**Features:**
- Configurable name, symbol, decimals
- Mint/burn capabilities (optional)
- Transfer and approval mechanics
- Uses `odra-modules::cep18` for standard compliance

### NFT Collection (`NftCollection`)
Non-fungible token collection with metadata support.

**Features:**
- Token URI for metadata (IPFS/HTTP)
- Configurable minting mode (public/restricted)
- Transfer and approval mechanics
- Compatible with CEP-78 standard

### Governance DAO (`GovernanceDAO`)
Decentralized governance with proposal and voting system.

**Features:**
- Token-weighted voting
- Proposal creation with configurable threshold
- Voting period and quorum settings
- Action execution (mint tokens, treasury transfers, config updates)

### AMM DEX (`CsprAiDEX`)
Automated Market Maker for token swaps.

**Features:**
- Liquidity pool creation
- Add/remove liquidity
- Token swaps with constant product formula (x * y = k)
- Configurable swap fees

## Deployed Contracts (Testnet)

All contracts are deployed on Casper Testnet and can be viewed on the block explorer:

| Contract | Package Hash | Explorer Link |
|----------|--------------|---------------|
| **Token (CEP-18)** | `b481b1e8...3bc05` | [View on Testnet Explorer](https://testnet.cspr.live/contract-package/b481b1e86bc2a1c5d73d5e108c6246ad0358889acc9ef0f429bd4cb454a3bc05) |
| **NFT Collection** | `195b64a1...583b` | [View on Testnet Explorer](https://testnet.cspr.live/contract-package/195b64a1cca143d9361790af34ef79d3094bb00094330c1ccc1cd4987c0b583b) |
| **Governance DAO** | `91083a42...506f` | [View on Testnet Explorer](https://testnet.cspr.live/contract-package/91083a42df41a577f2d5695ad4c78f799dc1d3016eccef4ce2a6f9a43c68506f) |
| **AMM DEX** | `7f09f5c8...bca1` | [View on Testnet Explorer](https://testnet.cspr.live/contract-package/7f09f5c808f2a3a684d70cfe49cec2c6b90c11aa1d8053046d91fd26a342bca1) |

<details>
<summary>Full Package Hashes</summary>

```
Token: contract-package-b481b1e86bc2a1c5d73d5e108c6246ad0358889acc9ef0f429bd4cb454a3bc05
NFT:   contract-package-195b64a1cca143d9361790af34ef79d3094bb00094330c1ccc1cd4987c0b583b
DAO:   contract-package-91083a42df41a577f2d5695ad4c78f799dc1d3016eccef4ce2a6f9a43c68506f
DEX:   contract-package-7f09f5c808f2a3a684d70cfe49cec2c6b90c11aa1d8053046d91fd26a342bca1
```
</details>

## Development

### Prerequisites

- Rust toolchain (see `rust-toolchain.toml`)
- [Odra CLI](https://docs.odra.dev/docs/getting-started/installation)

### Build Contracts

```bash
# Build all contracts to WASM
cargo odra build

# Build specific contract
cargo odra build -c Cep18Token
```

### Run Tests

```bash
# Fast tests with OdraVM (in-memory)
cargo odra test

# Accurate tests with CasperVM (slower but matches production)
cargo odra test -b casper
```

### Deploy to Network

```bash
# Set up secret key
export ODRA_CASPER_PRIVATE_KEY_PATH=path/to/secret_key.pem

# Deploy to testnet
cargo odra deploy -b casper -n testnet -c Cep18Token
```

## Integration with MCP Server

These contracts are integrated with the CSPR.AI MCP Server, which provides AI-accessible tools for:

- Querying contract state (balances, metadata, proposals)
- Building unsigned transactions (transfers, mints, votes)
- Transaction signing and submission

See the [MCP Server documentation](../mcp-server/README.md) for tool usage.

## Security Considerations

1. **No private keys in code** - All signing happens via MCP tools or CSPR.click wallet
2. **Input validation** - All entry points validate addresses and amounts
3. **Access control** - Owner-only functions protected with `Ownable` module
4. **Event emission** - State changes emit events for transparency

## License

Apache-2.0
