# CSPR.AI

AI-powered Model Context Protocol (MCP) server for Casper Network blockchain integration. Enables natural language interaction with Casper blockchain through Claude, Cursor, and other MCP-compatible AI assistants.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [MCP Server Setup](#mcp-server-setup)
  - [Web Dashboard Setup](#web-dashboard-setup)
- [MCP Integration](#mcp-integration)
  - [Claude Desktop](#claude-desktop)
  - [Cursor IDE](#cursor-ide)
  - [Claude Code](#claude-code)
  - [MCP Inspector](#mcp-inspector)
- [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview

CSPR.AI provides a bridge between AI assistants and the Casper Network blockchain through the Model Context Protocol. It enables developers and users to interact with Casper blockchain using natural language, making blockchain operations accessible through conversational interfaces.

### Key Capabilities

- **Blockchain Queries**: Check balances, validator information, transaction status
- **Transaction Building**: Create unsigned transactions for transfers, staking, token operations
- **Smart Contract Interaction**: Deploy and interact with CEP-18 tokens, CEP-78 NFTs, DAOs, and DEX contracts
- **Network Information**: Access real-time network data, validator metrics, and auction information

## Architecture

```mermaid
graph TB
    subgraph "AI Clients"
        A[Claude Desktop]
        B[Cursor IDE]
        C[Claude Code]
        D[Web Dashboard]
    end

    subgraph "CSPR.AI MCP Server"
        E[MCP Protocol Layer]
        F[Tool Handlers]
        G[Casper RPC Client]
        H[CSPR.cloud API Client]
    end

    subgraph "Casper Network"
        I[RPC Nodes]
        J[CSPR.cloud API]
        K[Smart Contracts]
    end

    A -->|stdio| E
    B -->|stdio| E
    C -->|stdio| E
    D -->|HTTP| E

    E --> F
    F --> G
    F --> H

    G --> I
    H --> J
    G --> K

    style E fill:#4CAF50
    style F fill:#2196F3
    style G fill:#FF9800
    style H fill:#FF9800
```

### Transport Modes

The MCP server supports two transport modes:

1. **stdio** (Standard Input/Output)
   - Default mode for CLI integration
   - Used by Claude Desktop, Cursor, Claude Code
   - Communicates via stdin/stdout following MCP protocol

2. **HTTP** (RESTful API)
   - Web-friendly transport
   - Used by web dashboard and custom integrations
   - Exposes `/mcp` endpoint for MCP protocol
   - Includes `/health` endpoint for monitoring

## Features

### Blockchain Operations

- **Account Management**
  - Query CSPR balances (motes and CSPR)
  - Convert public keys to account hashes
  - Validate public key formats

- **Staking & Delegation**
  - List active validators with stakes
  - Query validator rewards
  - Check delegation status
  - Build delegation/undelegation transactions

- **Transaction Management**
  - Build unsigned CSPR transfers
  - Query deploy status
  - Track transaction history
  - View account deploys

### Smart Contract Support

- **CEP-18 Tokens** (Fungible Tokens)
  - Deploy new token contracts
  - Query token metadata and balances
  - Build transfer, mint, and burn transactions

- **CEP-78 NFTs** (Non-Fungible Tokens)
  - Deploy NFT collections
  - Mint, transfer, and burn NFTs
  - Query NFT metadata and ownership

- **DAO Governance**
  - Deploy DAO contracts with governance tokens
  - Create and vote on proposals
  - Execute approved proposals
  - Query governance state

- **DEX (Decentralized Exchange)**
  - Deploy AMM-based DEX contracts
  - Create liquidity pools
  - Add/remove liquidity
  - Swap tokens using constant product formula

### Data APIs

- **Network Information**
  - Current era and auction metrics
  - Block explorer integration
  - Transfer history
  - Validator performance tracking

## Prerequisites

- **Node.js** 18.x or higher
- **pnpm** (recommended) or npm
- **Docker** and Docker Compose (for containerized deployment)
- **Git** for version control

### Optional

- **CSPR.cloud API Key** - Required for data API tools (deploy tracking, NFT queries, validator data)
  - Get your API key at [cspr.cloud](https://cspr.cloud)

## Quick Start

### MCP Server Setup

1. **Clone the repository**

```bash
git clone https://github.com/Blockchain-Oracle/cspr-ai.git
cd cspr-ai
```

2. **Install dependencies**

```bash
cd mcp-server
pnpm install
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env and add your configuration
```

Required environment variables:
```bash
# Network Configuration
CASPER_NETWORK=testnet                                    # or "mainnet"
CASPER_RPC_URL=https://node.testnet.cspr.cloud/rpc      # Optional, uses default if not set

# CSPR.cloud API (recommended for data API tools)
CSPR_CLOUD_API_KEY=your-api-key-here

# MCP Transport (stdio for CLI, http for web)
MCP_TRANSPORT=stdio                                       # or "http"
MCP_HTTP_PORT=3001                                       # Only for HTTP mode
CORS_ORIGIN=http://localhost:3000                        # Only for HTTP mode
```

4. **Run in development mode**

```bash
# For stdio mode (default)
pnpm dev

# For HTTP mode
MCP_TRANSPORT=http pnpm dev
```

5. **Build for production**

```bash
pnpm build
pnpm start
```

### Web Dashboard Setup

The web dashboard provides a visual interface for interacting with the MCP server and Casper blockchain.

1. **Start infrastructure services**

The web dashboard requires PostgreSQL and Redis for conversation history and session management.

```bash
cd web
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5433): Conversation history persistence
- **Redis** (port 6379): Session cache and real-time updates

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment**

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

Required environment variables:
```bash
# Database (from docker-compose.yml)
DATABASE_URL=postgresql://csprai:csprai_dev_password@localhost:5433/csprai

# MCP Server endpoint
MCP_SERVER_URL=http://localhost:3001

# AI Provider (choose one)
ANTHROPIC_API_KEY=your-anthropic-key
# or
OPENAI_API_KEY=your-openai-key
```

4. **Run development server**

```bash
pnpm dev
```

The web dashboard will be available at `http://localhost:3000`

## MCP Integration

### Claude Desktop

Claude Desktop supports MCP servers via stdio transport.

1. **Locate Claude Desktop config**

```bash
# macOS
~/Library/Application Support/Claude/claude_desktop_config.json

# Windows
%APPDATA%\Claude\claude_desktop_config.json

# Linux
~/.config/Claude/claude_desktop_config.json
```

2. **Add CSPR.AI MCP server**

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "casper": {
      "command": "node",
      "args": ["/absolute/path/to/cspr-ai/mcp-server/dist/index.js"],
      "env": {
        "CASPER_NETWORK": "testnet",
        "CSPR_CLOUD_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Important**: Use absolute paths and ensure the server is built (`pnpm build`).

3. **Restart Claude Desktop**

The Casper tools will be available in your next conversation.

### Cursor IDE

Cursor IDE supports MCP servers for enhanced coding assistance.

1. **Open Cursor Settings**

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) and select "Preferences: Open Settings (JSON)"

2. **Add MCP server configuration**

Add to `.cursor/config.json` or Cursor settings:

```json
{
  "mcp.servers": {
    "casper": {
      "command": "node",
      "args": ["/absolute/path/to/cspr-ai/mcp-server/dist/index.js"],
      "env": {
        "CASPER_NETWORK": "testnet",
        "CSPR_CLOUD_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3. **Reload Cursor**

Restart Cursor IDE to load the MCP server.

### Claude Code

Claude Code CLI supports MCP servers for terminal-based AI assistance.

1. **Install Claude Code**

```bash
npm install -g @anthropic-ai/claude-code
```

2. **Configure MCP server**

Edit `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "casper": {
      "command": "node",
      "args": ["/absolute/path/to/cspr-ai/mcp-server/dist/index.js"],
      "env": {
        "CASPER_NETWORK": "testnet",
        "CSPR_CLOUD_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3. **Use in terminal**

```bash
claude-code
# Casper tools are now available
```

### MCP Inspector

MCP Inspector is a development tool for testing MCP servers.

1. **Install MCP Inspector**

```bash
npx @modelcontextprotocol/inspector
```

2. **Connect to CSPR.AI**

```bash
# For stdio mode
npx @modelcontextprotocol/inspector node mcp-server/dist/index.js

# For HTTP mode (start server first)
MCP_TRANSPORT=http pnpm dev
# Then open http://localhost:3001 in inspector
```

3. **Test tools**

Use the inspector UI to:
- View available tools
- Test tool parameters
- Inspect responses
- Debug MCP protocol messages

## Docker Deployment

### MCP Server Container

1. **Build Docker image**

```bash
cd mcp-server
docker build -t cspr-ai-mcp:latest .
```

2. **Run container**

```bash
# HTTP mode (recommended for production)
docker run -d \
  --name cspr-ai-mcp \
  -p 3001:3001 \
  -e CASPER_NETWORK=testnet \
  -e CSPR_CLOUD_API_KEY=your-api-key \
  -e MCP_TRANSPORT=http \
  -e CORS_ORIGIN=https://your-domain.com \
  cspr-ai-mcp:latest

# Check health
curl http://localhost:3001/health
```

3. **View logs**

```bash
docker logs -f cspr-ai-mcp
```


## Configuration

### Environment Variables

#### Network Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CASPER_NETWORK` | Network: `testnet` or `mainnet` | `testnet` | No |
| `CASPER_RPC_URL` | Casper RPC endpoint URL | Network default | No |
| `CSPR_CLOUD_API_KEY` | API key for CSPR.cloud | - | Recommended |

#### MCP Transport

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MCP_TRANSPORT` | Transport mode: `stdio` or `http` | `stdio` | No |
| `MCP_HTTP_PORT` | HTTP server port | `3001` | No (HTTP mode) |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` | No (HTTP mode) |

#### Wallet Configuration (stdio mode only)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CASPER_SECRET_KEY` | Private key for signing (PEM or hex) | - | No |

**Security Warning**: Only use `CASPER_SECRET_KEY` in stdio mode (Claude Desktop/CLI). Never use in HTTP mode or expose to web frontends. Web users should sign via CSPR.click wallet.

### Network Endpoints

| Network | RPC URL | Explorer |
|---------|---------|----------|
| **Testnet** | https://node.testnet.cspr.cloud/rpc | https://testnet.cspr.live |
| **Mainnet** | https://node.cspr.cloud/rpc | https://cspr.live |

## Available Tools

### Account & Balance

- `casper_get_balance` - Query CSPR balance
- `casper_get_user` - Get user account info
- `casper_wallet_status` - Check wallet configuration

### Validators & Staking

- `casper_get_validators` - List active validators
- `casper_get_current_validators` - Get current era validators
- `casper_get_validator_rewards` - Query validator rewards
- `casper_get_validator_blocks` - Get blocks by validator
- `casper_get_staking_info` - Check delegation status
- `casper_build_delegation` - Build stake delegation transaction

### Transactions

- `casper_build_transfer` - Build CSPR transfer
- `casper_get_deploy` - Get deploy details
- `casper_get_deploy_status` - Quick status check
- `casper_check_deploy_status` - Verify transaction status
- `casper_get_account_deploys` - List account transactions
- `casper_get_account_transfers` - Get transfer history
- `casper_sign_and_submit_transaction` - Sign and submit (stdio only)

### Smart Contracts

#### CEP-18 Tokens
- `casper_deploy_token` - Deploy token contract
- `casper_query_token` - Query token state
- `casper_build_token_transfer` - Build token transfer
- `casper_build_token_mint` - Build mint transaction
- `casper_build_token_burn` - Build burn transaction

#### CEP-78 NFTs
- `casper_deploy_nft` - Deploy NFT collection
- `casper_query_nft` - Query NFT state
- `casper_build_nft_mint` - Build NFT mint
- `casper_build_nft_transfer` - Build NFT transfer
- `casper_build_nft_burn` - Build NFT burn

#### DAO Governance
- `casper_deploy_dao` - Deploy DAO contract
- `casper_query_dao` - Query DAO state
- `casper_build_dao_propose` - Create proposal
- `casper_build_dao_vote` - Vote on proposal
- `casper_build_dao_execute` - Execute proposal

#### DEX (Decentralized Exchange)
- `casper_deploy_dex` - Deploy DEX contract
- `casper_query_dex` - Query DEX state
- `casper_build_dex_create_pool` - Create liquidity pool
- `casper_build_dex_add_liquidity` - Add liquidity
- `casper_build_dex_remove_liquidity` - Remove liquidity
- `casper_build_dex_swap` - Swap tokens

### Network Information

- `casper_get_auction_metrics` - Get auction state
- `casper_get_time_periods` - Query time periods

All `build_*` tools return unsigned transactions that can be:
- Signed via CSPR.click wallet (web dashboard)
- Signed via `casper_sign_and_submit_transaction` (stdio mode with secret key)

## Development

### Project Structure

```
cspr-ai/
├── mcp-server/                 # MCP server implementation
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── constants.ts       # Network constants
│   │   ├── services/          # RPC and API clients
│   │   │   ├── casper-client.ts
│   │   │   └── cspr-cloud-client.ts
│   │   ├── tools/             # MCP tool implementations
│   │   │   ├── index.ts
│   │   │   ├── balance.ts
│   │   │   ├── validators.ts
│   │   │   ├── transactions.ts
│   │   │   ├── contracts/     # Smart contract tools
│   │   │   │   ├── token.ts   # CEP-18
│   │   │   │   ├── nft.ts     # CEP-78
│   │   │   │   ├── dao.ts     # DAO governance
│   │   │   │   └── dex.ts     # DEX AMM
│   │   │   └── signing.ts
│   │   ├── transport/         # Transport implementations
│   │   │   └── http.ts
│   │   ├── resources/         # MCP resources
│   │   ├── prompts/           # MCP prompts
│   │   └── utils/             # Utilities
│   ├── test/                  # Test suites
│   │   ├── unit/
│   │   └── integration/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── web/                        # Web dashboard (Next.js)
│   ├── app/                   # Next.js app router
│   ├── components/            # React components
│   ├── lib/                   # Utilities and configs
│   ├── docker-compose.yml     # PostgreSQL + Redis
│   ├── package.json
│   └── tsconfig.json
│
└── README.md                   # This file
```

### Running Tests

```bash
cd mcp-server

# Run all tests
pnpm test

# Run with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/tools/balance.test.ts
```

### Code Quality

```bash
# Lint code
cd web
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

### Development Workflow

1. **Create feature branch**
```bash
git checkout -b feature/your-feature
```

2. **Make changes**
- Follow existing code patterns
- Add tests for new features
- Update documentation

3. **Test locally**
```bash
# Test MCP server
cd mcp-server
pnpm test
pnpm build

# Test integration with Claude Desktop
# Update claude_desktop_config.json
# Test in Claude Desktop

# Test web dashboard
cd web
docker-compose up -d
pnpm dev
```

4. **Commit and push**
```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

5. **Create pull request**

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass
5. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Write tests for new features
- Document public APIs
- Use semantic commit messages
- Keep commits focused and atomic

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: https://docs.cspr.ai (coming soon)
- **Issues**: https://github.com/Blockchain-Oracle/cspr-ai/issues
- **Casper Network**: https://casper.network
- **CSPR.cloud**: https://cspr.cloud
- **Model Context Protocol**: https://modelcontextprotocol.io

---

Built with the Model Context Protocol for Casper Network
