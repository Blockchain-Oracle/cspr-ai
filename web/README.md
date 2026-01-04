<h1 align="center"><img src="../assets/logo.svg" alt="CSPR.AI" height="40" style="vertical-align: middle;" /> Web Dashboard</h1>

<p align="center">
  AI-powered web interface for interacting with the Casper blockchain through natural language.
</p>

Built with Next.js 16, the CSPR.AI dashboard provides a conversational interface to the Model Context Protocol (MCP) server, enabling users to query blockchain state, build transactions, and interact with smart contracts using AI assistance.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Infrastructure Setup](#infrastructure-setup)
- [Configuration](#configuration)
- [Database Management](#database-management)
- [Development](#development)
- [Integration with MCP Server](#integration-with-mcp-server)
- [CSPR.click Wallet Integration](#csprclick-wallet-integration)
- [AI SDK Usage](#ai-sdk-usage)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The CSPR.AI web dashboard is a Next.js application that bridges AI assistants with the Casper blockchain. It provides:

- **Conversational Interface**: Chat with AI about blockchain operations
- **Wallet Integration**: Connect via CSPR.click for transaction signing
- **MCP Integration**: Communicates with MCP server via HTTP transport
- **Conversation Persistence**: PostgreSQL stores chat history
- **Session Management**: Redis caches active conversations
- **Multi-Provider AI**: Supports Anthropic Claude and OpenAI models

### Architecture

```mermaid
graph TB
    User[User Browser]
    Web[Next.js Dashboard]
    DB[(PostgreSQL)]
    Cache[(Redis)]
    MCP[MCP Server]
    Wallet[CSPR.click Wallet]
    AI[AI Provider]

    User -->|Interact| Web
    Web -->|Store History| DB
    Web -->|Cache Sessions| Cache
    Web -->|MCP Tools| MCP
    Web -->|AI Requests| AI
    User -->|Sign Txs| Wallet
    Wallet -->|Signed Deploy| Web
    Web -->|Submit| MCP

    subgraph "Web Dashboard"
        Web
    end

    subgraph "Infrastructure"
        DB
        Cache
    end

    subgraph "External Services"
        MCP
        AI
        Wallet
    end
```

## Features

### Conversational Blockchain Access

- **Natural Language Queries**: Ask about balances, validators, transaction status
- **Transaction Building**: Build unsigned transactions through conversation
- **Smart Contract Interaction**: Deploy and interact with CEP-18/CEP-78 contracts
- **DAO Governance**: Create proposals, vote, execute decisions
- **DEX Operations**: Swap tokens, manage liquidity pools

### User Experience

- **Chat History**: Persistent conversation threads
- **Code Highlighting**: Syntax highlighting for transaction details
- **Markdown Rendering**: Rich formatting for AI responses
- **Dark/Light Mode**: Theme switching via next-themes
- **Responsive Design**: Mobile-friendly interface
- **Loading States**: Progress indicators for blockchain queries

### Developer Features

- **TypeScript**: Full type safety across the application
- **Drizzle ORM**: Type-safe database queries and migrations
- **Server Actions**: Next.js server actions for API routes
- **Tailwind CSS**: Utility-first styling
- **React 19**: Latest React features (Server Components, Actions)

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 16 | React framework with App Router |
| **Runtime** | React 19 | UI rendering and component model |
| **AI SDK** | Vercel AI SDK | Stream AI responses, tool calling |
| **AI Providers** | Anthropic Claude, OpenAI | Language models for conversation |
| **MCP Client** | @ai-sdk/mcp | Communicate with MCP server |
| **Database** | PostgreSQL 16 | Conversation history persistence |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **Cache** | Redis 7 | Session and active conversation cache |
| **Wallet** | CSPR.click | Client-side transaction signing |
| **Blockchain** | casper-js-sdk | Casper Network integration |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **UI Components** | shadcn/ui (via CVA) | Accessible component primitives |
| **Animation** | Framer Motion | Smooth transitions and animations |
| **Icons** | Lucide React | Icon library |
| **Markdown** | react-markdown | Render AI responses with formatting |

## Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm
- Docker and Docker Compose (for local infrastructure)
- MCP server running (see [mcp-server README](../mcp-server/README.md))

## Installation

### Install Dependencies

```bash
cd web
pnpm install
```

### Database Schema

The application uses Drizzle ORM with PostgreSQL. Schema is defined in `lib/db/schema.ts`:

```typescript
// Conversations (chats)
{
  id: uuid (primary key)
  title: text
  createdAt: timestamp
  updatedAt: timestamp
}

// Messages (within conversations)
{
  id: uuid (primary key)
  conversationId: uuid (foreign key)
  role: 'user' | 'assistant' | 'system'
  content: jsonb (structured message content)
  createdAt: timestamp
}

// Parts (message components for streaming)
{
  id: uuid (primary key)
  messageId: uuid (foreign key)
  type: 'text' | 'tool-call' | 'tool-result'
  content: jsonb
  createdAt: timestamp
}
```

## Infrastructure Setup

### Start PostgreSQL and Redis

The `docker-compose.yml` in the `web/` directory provides the complete infrastructure:

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

**Services Started:**
- PostgreSQL: `localhost:5433` (external) / `5432` (internal)
- Redis: `localhost:6379`

**Optional Debug Tools:**

Start with debug profile for database/cache inspection:

```bash
# Start with pgAdmin and Redis Commander
docker-compose --profile debug up -d

# Access tools:
# - pgAdmin: http://localhost:8082 (admin@csprai.local / admin)
# - Redis Commander: http://localhost:8081
```

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **postgres** | postgres:16-alpine | 5433:5432 | Conversation persistence |
| **redis** | redis:7-alpine | 6379:6379 | Session cache, real-time updates |
| **pgadmin** (debug) | dpage/pgadmin4 | 8082:80 | PostgreSQL GUI |
| **redis-commander** (debug) | rediscommander/redis-commander | 8081:8081 | Redis GUI |

### Stop Infrastructure

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Configuration

### Environment Variables

Create `.env.local` in the `web/` directory:

```bash
cp .env.example .env.local
```

#### Required Configuration

```bash
# MCP Server URL (HTTP transport)
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3001

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://csprai:csprai_dev_password@localhost:5433/csprai
```

#### Network Endpoints

| Environment | Value |
|-------------|-------|
| **Development** | `http://localhost:3001` |
| **Production** | Your deployed MCP server URL |

#### Database URL Format

**Local Development (Docker Compose):**
```
postgresql://csprai:csprai_dev_password@localhost:5433/csprai
```

**Neon PostgreSQL (Production):**
```
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

**Connection String Components:**
- Protocol: `postgresql://`
- User: `csprai` (Docker) or your Neon username
- Password: `csprai_dev_password` (Docker) or your Neon password
- Host: `localhost:5433` (Docker) or `host.neon.tech` (Neon)
- Database: `csprai` (Docker) or your Neon database name
- SSL: Optional for local, required for Neon (`?sslmode=require`)

## Database Management

### Drizzle ORM Commands

The application uses Drizzle Kit for database migrations and schema management.

#### Generate Migration

After modifying `lib/db/schema.ts`:

```bash
# Generate migration SQL files
pnpm db:generate
```

This creates migration files in `drizzle/` directory.

#### Push Schema Changes

Apply schema changes directly to database (development):

```bash
# Push schema without generating migration files
pnpm db:push
```

**Use for:** Rapid iteration during development.

#### Run Migrations

Apply migrations to database (production):

```bash
# Execute pending migrations
pnpm db:migrate
```

**Use for:** Production deployments with version control.

#### Drizzle Studio

Visual database browser:

```bash
# Open Drizzle Studio UI
pnpm db:studio
```

Opens at `https://local.drizzle.studio` - inspect tables, run queries, view relationships.

### Database Workflow

**Development:**
1. Modify schema in `lib/db/schema.ts`
2. Run `pnpm db:push` to apply changes immediately
3. Test with Drizzle Studio (`pnpm db:studio`)

**Production:**
1. Modify schema in `lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Commit migration files to git
4. Run `pnpm db:migrate` on production database

## Development

### Start Development Server

```bash
# Start Next.js development server
pnpm dev
```

Opens at `http://localhost:3000`

**Development Features:**
- Hot Module Replacement (HMR)
- Fast Refresh for React components
- TypeScript compilation
- Tailwind CSS JIT compilation

### Build for Production

```bash
# Create optimized production build
pnpm build

# Start production server
pnpm start
```

### Linting

```bash
# Run ESLint
pnpm lint
```

## Integration with MCP Server

The web dashboard communicates with the MCP server via HTTP transport using the AI SDK's MCP provider.

### MCP Client Setup

**Configuration** (`lib/mcp/client.ts`):

```typescript
import { createMCPClient } from '@ai-sdk/mcp';

const mcpClient = createMCPClient({
  url: process.env.NEXT_PUBLIC_MCP_SERVER_URL,
  transport: 'http',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Session Management

Each conversation creates an MCP session identified by `mcp-session-id` header:

```typescript
const sessionId = crypto.randomUUID();

const response = await mcpClient.callTool({
  name: 'casper_get_balance',
  arguments: { public_key: '01abc...' },
  sessionId,
});
```

### Tool Calling Flow

```mermaid
sequenceDiagram
    participant User
    participant Web
    participant AI
    participant MCP
    participant Casper

    User->>Web: Ask "What's my balance?"
    Web->>AI: Stream request with tools
    AI->>AI: Determine tool needed
    AI->>Web: Tool call: casper_get_balance
    Web->>MCP: Execute tool via HTTP
    MCP->>Casper: RPC call to network
    Casper->>MCP: Balance data
    MCP->>Web: Tool result
    Web->>AI: Tool result
    AI->>AI: Generate response
    AI->>Web: Stream: "Your balance is X CSPR"
    Web->>User: Display response
```

### Available MCP Tools

All 50+ tools from the MCP server are available via AI conversation:

**Account & Balance:**
- `casper_get_balance` - Query CSPR balance
- `casper_wallet_status` - Check wallet configuration

**Validators & Staking:**
- `casper_get_validators` - List active validators
- `casper_build_delegation` - Build stake delegation

**Transactions:**
- `casper_build_transfer` - Build CSPR transfer
- `casper_get_deploy_status` - Check transaction status

**Smart Contracts:**
- CEP-18 tokens (deploy, query, transfer, mint, burn)
- CEP-78 NFTs (deploy, mint, transfer, burn)
- DAO governance (proposals, voting, execution)
- DEX operations (pools, swaps, liquidity)

See [MCP server README](../mcp-server/README.md#available-tools) for complete tool list.

## CSPR.click Wallet Integration

The dashboard uses CSPR.click for **client-side transaction signing**. Private keys never leave the user's browser.

### Wallet Connection Flow

1. User clicks "Connect Wallet"
2. CSPR.click modal opens
3. User authorizes connection
4. Public key stored in session
5. Dashboard can build unsigned transactions
6. User signs via CSPR.click when ready

### Transaction Signing

**AI builds unsigned transaction:**
```typescript
// AI calls MCP tool to build transaction
const unsignedDeploy = await mcpClient.callTool({
  name: 'casper_build_transfer',
  arguments: {
    from_public_key: userPublicKey,
    to_public_key: recipientKey,
    amount_cspr: 100,
  },
});
```

**User signs via CSPR.click:**
```typescript
import { CsprClickConnector } from '@make-software/csprclick-ui';

const signedDeploy = await csprClick.sign(
  unsignedDeploy.unsigned_deploy,
  userPublicKey
);

// Submit to network
const deployHash = await casperClient.putDeploy(signedDeploy);
```

### Security Model

```
╔══════════════════════════════════════╗
║  CSPR.AI Security Boundaries         ║
╠══════════════════════════════════════╣
║                                      ║
║  ┌─────────────────────────────┐    ║
║  │  User's Browser              │    ║
║  │  • CSPR.click Wallet         │    ║
║  │  • Private Keys (client-side)│    ║
║  │  • Transaction Signing       │    ║
║  └─────────────────────────────┘    ║
║            ▲                         ║
║            │ Unsigned transactions   ║
║            │                         ║
║  ┌─────────────────────────────┐    ║
║  │  Web Dashboard (Server)      │    ║
║  │  • Build transactions (AI)   │    ║
║  │  • Store chat history        │    ║
║  │  • NO private keys           │    ║
║  └─────────────────────────────┘    ║
║            ▲                         ║
║            │ Tools                   ║
║            │                         ║
║  ┌─────────────────────────────┐    ║
║  │  MCP Server                  │    ║
║  │  • Build unsigned transactions│    ║
║  │  • Query blockchain state    │    ║
║  │  • NO signing capability     │    ║
║  └─────────────────────────────┘    ║
║                                      ║
╚══════════════════════════════════════╝
```

**Key Points:**
- Private keys: Client-side only (CSPR.click)
- Web dashboard: Builds unsigned transactions
- MCP server: Returns unsigned transactions
- User: Signs every transaction explicitly

## AI SDK Usage

The dashboard uses Vercel AI SDK for streaming AI responses and tool calling.

### Provider Configuration

**Anthropic Claude:**
```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = anthropic('claude-3-5-sonnet-20241022');
```

**OpenAI:**
```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = openai('gpt-4-turbo');
```

### Streaming Responses

Server Action for chat:

```typescript
'use server';

import { streamText } from 'ai';

export async function chat(messages: Message[]) {
  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    tools: mcpTools, // MCP tools as AI SDK tools
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

Client-side consumption:

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

### Tool Execution

MCP tools are converted to AI SDK tool format:

```typescript
const tools = {
  casper_get_balance: {
    description: 'Query CSPR balance for an account',
    parameters: z.object({
      public_key: z.string(),
      response_format: z.enum(['markdown', 'json']),
    }),
    execute: async (args) => {
      return await mcpClient.callTool({
        name: 'casper_get_balance',
        arguments: args,
      });
    },
  },
  // ... 50+ more tools
};
```

## Project Structure

```
web/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   ├── chat/                    # Chat interface
│   │   └── page.tsx
│   ├── docs/                    # Documentation pages
│   │   ├── getting-started/
│   │   ├── how-it-works/
│   │   ├── architecture/
│   │   ├── tools/
│   │   ├── faq/
│   │   └── roadmap/
│   └── about/                   # About page
│
├── components/                   # React components
│   ├── landing/                 # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── FeaturesCarousel.tsx
│   │   ├── UseCases.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── TechSpecs.tsx
│   │   └── CTA.tsx
│   ├── chat/                    # Chat interface components
│   ├── layout/                  # Layout components (Header, Footer)
│   └── ui/                      # shadcn/ui components (Button, Card, etc.)
│
├── lib/                          # Utilities and configuration
│   ├── db/                      # Database
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   └── client.ts            # Database client
│   ├── mcp/                     # MCP client
│   │   └── client.ts            # MCP HTTP client
│   ├── ai/                      # AI SDK configuration
│   │   └── providers.ts         # Anthropic, OpenAI setup
│   └── utils.ts                 # Utility functions
│
├── drizzle/                      # Database migrations
│   └── 0001_initial.sql
│
├── public/                       # Static assets
│   └── images/
│
├── docker/                       # Docker initialization
│   └── init-db.sql              # Database initialization script
│
├── docker-compose.yml            # Infrastructure (PostgreSQL, Redis)
├── drizzle.config.ts             # Drizzle Kit configuration
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
└── .env.example                  # Environment template
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js pages and routes (App Router) |
| `components/` | Reusable React components |
| `lib/db/` | Database schema, queries, migrations |
| `lib/mcp/` | MCP client for HTTP transport |
| `lib/ai/` | AI SDK provider configuration |
| `drizzle/` | Generated migration files |
| `docker/` | Docker initialization scripts |

## Deployment

### Environment Setup

**Production environment variables:**

```bash
# MCP Server URL (deployed server)
NEXT_PUBLIC_MCP_SERVER_URL=https://mcp.yourdomain.com

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Optional: Redis (Upstash, Redis Cloud)
REDIS_URL=redis://default:password@host:6379
```

### Database Migration

Run migrations on production database:

```bash
# Generate migrations (local)
pnpm db:generate

# Apply migrations (production)
DATABASE_URL="postgresql://..." pnpm db:migrate
```

### Vercel Deployment

1. **Push to GitHub**
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

2. **Connect to Vercel**
   - Import repository in Vercel dashboard
   - Set root directory to `web/`
   - Configure environment variables

3. **Build Configuration**
   - Framework: Next.js
   - Build command: `pnpm build`
   - Output directory: `.next`

4. **Deploy**
   - Automatic deployment on push to main
   - Preview deployments for pull requests

### Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t csprai-web .

# Run container
docker run -d \
  --name csprai-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_MCP_SERVER_URL=http://mcp-server:3001 \
  -e DATABASE_URL=postgresql://... \
  csprai-web
```

### Health Check

Verify deployment:

```bash
# Check if server responds
curl https://your-domain.com

# Check API route
curl https://your-domain.com/api/health
```

## Troubleshooting

### Database Connection Issues

**Error**: `Connection refused` to PostgreSQL

**Solution**:
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres

# Verify port mapping
netstat -an | grep 5433
```

### MCP Server Connection

**Error**: `Failed to connect to MCP server`

**Solution**:
```bash
# 1. Verify MCP server is running
curl http://localhost:3001/health

# 2. Check NEXT_PUBLIC_MCP_SERVER_URL in .env.local
cat .env.local | grep MCP_SERVER_URL

# 3. Test MCP endpoint directly
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: test" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### CSPR.click Wallet Issues

**Error**: Wallet not connecting

**Solution**:
1. Install CSPR.click browser extension
2. Clear browser cache and reload
3. Check console for errors (F12)
4. Verify network (testnet vs mainnet)

### Database Migration Issues

**Error**: Migration fails or schema out of sync

**Solution**:
```bash
# 1. Check current schema state
pnpm db:studio

# 2. Drop all tables and re-migrate (DEVELOPMENT ONLY)
# WARNING: This deletes all data
docker-compose down -v
docker-compose up -d
pnpm db:push

# 3. For production, create rollback migration
pnpm db:generate
# Edit migration to revert changes
pnpm db:migrate
```

### Build Errors

**Error**: TypeScript compilation errors

**Solution**:
```bash
# 1. Clean build artifacts
rm -rf .next
rm -rf node_modules

# 2. Reinstall dependencies
pnpm install

# 3. Rebuild
pnpm build
```

### Port Conflicts

**Error**: Port 3000 or 5433 already in use

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in package.json
# "dev": "next dev -p 3001"
```

### Redis Connection Issues

**Error**: Redis connection refused

**Solution**:
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker exec -it csprai-redis redis-cli ping
# Should return: PONG

# Restart Redis
docker-compose restart redis
```

## Support

- **Issues**: https://github.com/Blockchain-Oracle/cspr-ai/issues
- **MCP Server**: See [mcp-server README](../mcp-server/README.md)
- **Casper Network**: https://casper.network
- **CSPR.click**: https://cspr.click
- **AI SDK**: https://sdk.vercel.ai

## License

MIT License - see LICENSE file for details
