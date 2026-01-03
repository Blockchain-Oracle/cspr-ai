# CSPR.AI Frontend Design & Implementation Guide

> **Research Date**: December 24, 2025
> **Stack**: Next.js 15 App Router + Vercel AI SDK + Anthropic Claude
> **Pattern**: Generative UI with Tool-Based Component Rendering

---

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Generative UI Fundamentals](#generative-ui-fundamentals)
3. [Page Designs](#page-designs)
4. [Implementation Patterns](#implementation-patterns)
5. [Component Library](#component-library)

---

## Core Architecture

### Technology Stack

```json
{
  "framework": "Next.js 15 (App Router)",
  "ai": "Vercel AI SDK 5.0 (@ai-sdk/react)",
  "model": "Claude Sonnet 4.5 (@ai-sdk/anthropic)",
  "ui": "shadcn/ui + Tailwind CSS",
  "animations": "@magicuidesign/mcp",
  "wallet": "CSPR.click",
  "database": "Drizzle ORM + Vercel Postgres"
}
```

### The Generative UI Revolution

Instead of building fixed UIs that display JSON responses, **AI generates custom React components** dynamically for each interaction. This is the core innovation.

**Traditional Approach** (BAD ❌):
```tsx
// AI returns JSON, you parse and display
const response = await ai.chat("Check my balance");
// response = { balance: 1000, currency: "CSPR" }
return <div>Balance: {response.balance} {response.currency}</div>
```

**Generative UI Approach** (GOOD ✅):
```tsx
// AI returns ACTUAL REACT COMPONENTS
const result = await streamText({
  model: anthropic('claude-sonnet-4-5'),
  tools: {
    getBalance: {
      description: 'Get account balance',
      parameters: z.object({ account: z.string() }),
      execute: async ({ account }) => {
        const balance = await fetchBalance(account);
        return balance; // Just return data
      }
    }
  }
});

// Client renders tool results as components
{message.toolInvocations?.map(tool => {
  if (tool.toolName === 'getBalance') {
    return <BalanceCard data={tool.result} />; // Custom component!
  }
})}
```

---

## Generative UI Fundamentals

### Two Approaches from Vercel AI SDK

#### Approach 1: `streamText` + `useChat` (RECOMMENDED ✅)

**Why this is better**:
- Separates AI logic (server) from UI rendering (client)
- Automatic parallel tool calling
- Multi-step reasoning support
- Better error handling
- Follows Next.js best practices

**Server Route Handler** (`app/api/chat/route.ts`):
```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: `You are CSPR.AI, an AI assistant for Casper Network.

    Guide users through blockchain operations:
    - Account queries (balances, tokens, NFTs)
    - Transfers and swaps
    - Staking and delegation
    - Smart contract interactions

    CRITICAL: Always preview transactions before execution.
    Never execute transfers without explicit user confirmation.`,
    messages,
    tools: {
      casper_get_account_balance: {
        description: 'Get CSPR balance for an account',
        parameters: z.object({
          account: z.string().describe('Account address or public key')
        }),
        execute: async ({ account }) => {
          // Call your MCP server here
          const result = await mcpClient.callTool('casper_get_account_balance', { account });
          return result;
        }
      },
      casper_get_account_tokens: {
        description: 'Get all CEP-18 tokens for an account',
        parameters: z.object({
          account_identifier: z.string()
        }),
        execute: async ({ account_identifier }) => {
          const result = await mcpClient.callTool('casper_get_account_tokens', {
            account_identifier
          });
          return result;
        }
      },
      casper_build_transfer: {
        description: 'Build a CSPR transfer (requires wallet signature)',
        parameters: z.object({
          from_public_key: z.string(),
          to_address: z.string(),
          amount_cspr: z.number(),
        }),
        execute: async (params) => {
          const deploy = await mcpClient.callTool('casper_build_transfer', params);
          return {
            ...deploy,
            requiresSignature: true // Flag for UI
          };
        }
      }
      // Add all 50+ MCP tools here
    },
    maxSteps: 5 // Enable multi-step reasoning
  });

  return result.toUIMessageStreamResponse();
}
```

**Client Component** (`app/chats/page.tsx`):
```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { ChatMessage } from '@/components/chat/message';
import { ChatInput } from '@/components/chat/input';

export default function ChatPage() {
  const { messages, input, setInput, append, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 5,
  });

  return (
    <div className="flex h-screen flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={(value) => append({ role: 'user', content: value })}
        disabled={isLoading}
      />
    </div>
  );
}
```

**Message Component with Tool-Based Rendering** (`components/chat/message.tsx`):
```tsx
'use client';

import { Message as AIMessage } from 'ai';
import { BalanceCard } from './tools/balance-card';
import { TokenList } from './tools/token-list';
import { NFTGallery } from './tools/nft-gallery';
import { TransactionPreview } from './tools/transaction-preview';

export function ChatMessage({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-4 ${
        isUser
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-100'
      }`}>
        {/* Text content */}
        {message.content && (
          <div className="prose prose-invert max-w-none">
            {message.content}
          </div>
        )}

        {/* Tool invocations as custom components */}
        {message.toolInvocations?.map((tool) => {
          // Handle loading state
          if (tool.state === 'call') {
            return (
              <div key={tool.toolCallId} className="animate-pulse">
                Loading {tool.toolName}...
              </div>
            );
          }

          // Handle result state with custom components
          if (tool.state === 'result') {
            switch (tool.toolName) {
              case 'casper_get_account_balance':
                return (
                  <BalanceCard
                    key={tool.toolCallId}
                    data={tool.result}
                  />
                );

              case 'casper_get_account_tokens':
                return (
                  <TokenList
                    key={tool.toolCallId}
                    tokens={tool.result.tokens}
                    totalCount={tool.result.total_tokens}
                  />
                );

              case 'casper_get_account_nfts':
                return (
                  <NFTGallery
                    key={tool.toolCallId}
                    nfts={tool.result.nfts}
                  />
                );

              case 'casper_build_transfer':
                return (
                  <TransactionPreview
                    key={tool.toolCallId}
                    deploy={tool.result}
                  />
                );

              // Add more tool renderings as needed
              default:
                // Fallback to JSON display
                return (
                  <pre key={tool.toolCallId} className="text-xs overflow-auto">
                    {JSON.stringify(tool.result, null, 2)}
                  </pre>
                );
            }
          }

          return null;
        })}
      </div>
    </div>
  );
}
```

#### Approach 2: `streamUI` with Server Actions (Alternative)

**Use case**: When you want AI to directly return React components from the server.

```tsx
'use server';

import { streamUI } from '@ai-sdk/rsc';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function generateResponse(prompt: string) {
  const result = await streamUI({
    model: anthropic('claude-sonnet-4-5'),
    prompt,
    text: async function* ({ content }) {
      yield <div className="animate-pulse">Thinking...</div>;
      return <div className="prose">{content}</div>;
    },
    tools: {
      getBalance: {
        description: 'Get account balance',
        parameters: z.object({ account: z.string() }),
        generate: async function* ({ account }) {
          // Yield loading component
          yield <div className="animate-pulse">Fetching balance...</div>;

          // Fetch data
          const balance = await fetchBalance(account);

          // Return final component
          return <BalanceCard data={balance} />;
        }
      }
    }
  });

  return result.value; // Returns React.ReactNode
}
```

**Client**:
```tsx
'use client';

import { useState } from 'react';
import { generateResponse } from './actions';

export default function ChatPage() {
  const [result, setResult] = useState<React.ReactNode>();

  return (
    <div>
      <div>{result}</div>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const response = await generateResponse(input);
        setResult(response);
      }}>
        <input type="text" />
        <button>Send</button>
      </form>
    </div>
  );
}
```

**⚠️ Note**: The route handler approach (`streamText` + `useChat`) is **recommended** by Vercel for better separation of concerns and automatic handling of parallel/multi-step tool calls.

---

## Page Designs

### 1. Landing Page (`/`)

**Purpose**: Showcase the conversational blockchain revolution

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  CSPR.AI Logo      [Chats] [Docs]  [Connect Wallet]│
├────────────────────────────────────────────────────┤
│                                                     │
│        STOP VISITING WEBSITES.                     │
│        START TALKING TO CASPER.                    │
│                                                     │
│    [Get Started →]  [View Demo]                    │
│                                                     │
│    ┌──────────────────────────────┐               │
│    │ 💬 "Check my balance"        │               │
│    │ ⚡ Instant component render   │               │
│    └──────────────────────────────┘               │
│                                                     │
├────────────────────────────────────────────────────┤
│  Features:                                         │
│  ┌─────┐  ┌─────┐  ┌─────┐                       │
│  │ 🤖  │  │ ⚡  │  │ 🔐  │                       │
│  │ 50+ │  │Real │  │Secure│                      │
│  │Tools│  │Time │  │ CSPR │                      │
│  └─────┘  └─────┘  └─────┘                       │
└────────────────────────────────────────────────────┘
```

**Key Elements**:
- **Dark gradient background**: `from-slate-950 via-slate-900 to-slate-950`
- **Animated text**: Use `@magicuidesign/mcp` for text animations
- **Live demo bubble**: Show actual AI interaction
- **Feature cards**: Glassmorphism effect with `backdrop-blur-lg`

```tsx
// app/page.tsx
import { HeroSection } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <HeroSection />
      <Features />
    </main>
  );
}
```

### 2. Chat Interface (`/chats`)

**Purpose**: Main application - conversational blockchain interface

**Layout**:
```
┌──────┬─────────────────────────────────────────┐
│      │  🟢 Testnet    user@cspr.ai    [⚙️]    │
│ New  ├─────────────────────────────────────────┤
│ Chat │                                          │
│      │  User: Check my CSPR balance            │
│──────│  ┌─────────────────────────────────┐   │
│Recent│  │ AI: Fetching balance...          │   │
│      │  └─────────────────────────────────┘   │
│• NFT │                                          │
│• Swap│  ┌─────────────────────────────────┐   │
│      │  │ ╔══════════════════════════╗    │   │
│──────│  │ ║ 💰 Account Balance        ║    │   │
│Saved │  │ ║ 1,234.56 CSPR            ║    │   │
│      │  │ ║ [View Details] [Transfer] ║    │   │
│⭐ FAQ│  │ ╚══════════════════════════╝    │   │
│      │  └─────────────────────────────────┘   │
│      │                                          │
│      │  [Type your message...]       [Send →]  │
└──────┴─────────────────────────────────────────┘
```

**Features**:
- **Streaming responses**: Progressive component rendering
- **Custom tool components**: Each MCP tool gets custom UI
- **Conversation persistence**: Save to database with Drizzle
- **CSPR.click integration**: Header shows wallet status

**Sidebar** (`components/chat/sidebar.tsx`):
```tsx
'use client';

export function ChatSidebar() {
  const conversations = useConversations(); // Custom hook

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4">
      <button className="w-full py-2 px-4 bg-blue-600 rounded-lg mb-4">
        + New Chat
      </button>

      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase">Recent</p>
        {conversations.map(conv => (
          <button
            key={conv.id}
            className="w-full text-left py-2 px-3 rounded hover:bg-slate-800"
          >
            {conv.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
```

### 3. Documentation (`/docs`)

**Purpose**: Interactive documentation with embedded chat

**Layout**:
```
┌──────────┬──────────────────────────────────┐
│          │ # Getting Started                 │
│Getting   │                                   │
│Started   │ Try asking in chat:               │
│          │ "Check my CSPR balance"           │
│──────────│                                   │
│Guides    │ ```typescript                     │
│• Balance │ const { data } = await            │
│• Transfer│   getBalance(account);            │
│• Staking │ ```                               │
│          │ [Run in Chat →]                   │
│──────────│                                   │
│API       │ ┌─────────────────────────┐      │
│• Tools   │ │ 💬 Questions? Ask AI     │      │
│• Types   │ └─────────────────────────┘      │
└──────────┴──────────────────────────────────┘
```

**Interactive Code Blocks**:
```tsx
'use client';

export function CodeBlock({ code, prompt }: {
  code: string;
  prompt?: string;
}) {
  const router = useRouter();

  return (
    <div className="relative group">
      <SyntaxHighlighter language="typescript">
        {code}
      </SyntaxHighlighter>
      {prompt && (
        <button
          onClick={() => router.push(`/chats?q=${encodeURIComponent(prompt)}`)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-3 py-1 bg-blue-600 rounded"
        >
          Run in Chat →
        </button>
      )}
    </div>
  );
}
```

---

## Implementation Patterns

### MCP Client Integration

**MCP Client Singleton** (`lib/mcp/client.ts`):
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class MCPClient {
  private client: Client | null = null;

  async connect() {
    if (this.client) return this.client;

    const transport = new StdioClientTransport({
      command: 'node',
      args: ['../mcp-server/build/index.js'],
      env: {
        ...process.env,
        CASPER_NETWORK: process.env.NEXT_PUBLIC_CASPER_NETWORK || 'testnet',
        CSPR_CLOUD_API_KEY: process.env.CSPR_CLOUD_API_KEY,
      }
    });

    this.client = new Client({
      name: 'cspr-ai-web',
      version: '1.0.0'
    }, { capabilities: {} });

    await this.client.connect(transport);
    return this.client;
  }

  async callTool(name: string, args: any) {
    const client = await this.connect();
    const response = await client.callTool({ name, arguments: args });

    // Return structured content if available
    return response.structuredContent || response.content[0]?.text;
  }

  async listTools() {
    const client = await this.connect();
    const { tools } = await client.listTools();
    return tools;
  }
}

export const mcpClient = new MCPClient();
```

### Database Schema (Drizzle ORM)

```typescript
// lib/db/schema.ts
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content'),
  toolInvocations: jsonb('tool_invocations'), // Store tool calls
  createdAt: timestamp('created_at').defaultNow(),
});
```

### CSPR.click Wallet Integration

**Wallet Provider** (`lib/wallet/provider.tsx`):
```tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface WalletContextType {
  account: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signDeploy: (deploy: any) => Promise<string>;
}

const WalletContext = createContext<WalletContextType>(null!);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);

  const connect = async () => {
    // CSPR.click connection logic
    if (window.csprclick) {
      const accounts = await window.csprclick.requestAccounts();
      setAccount(accounts[0]);
    }
  };

  const disconnect = () => {
    setAccount(null);
  };

  const signDeploy = async (deploy: any) => {
    if (!window.csprclick) throw new Error('CSPR.click not installed');

    const signedDeploy = await window.csprclick.signDeploy(deploy);
    return signedDeploy;
  };

  return (
    <WalletContext.Provider value={{
      account,
      isConnected: !!account,
      connect,
      disconnect,
      signDeploy
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
```

---

## Component Library

### Balance Card

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BalanceCard({ data }: { data: any }) {
  const { account, balance_cspr, balance_motes } = data;

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💰 Account Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-400">Address</p>
            <p className="font-mono text-xs text-slate-300 truncate">{account}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">CSPR Balance</p>
            <p className="text-3xl font-bold text-green-400">
              {Number(balance_cspr).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Transaction Preview

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/lib/wallet/hooks';

export function TransactionPreview({ deploy }: { deploy: any }) {
  const { signDeploy } = useWallet();
  const [status, setStatus] = useState<'preview' | 'signing' | 'success'>('preview');

  const handleSign = async () => {
    setStatus('signing');
    try {
      await signDeploy(deploy);
      setStatus('success');
    } catch (error) {
      setStatus('preview');
    }
  };

  return (
    <Card className="border-yellow-600/50 bg-yellow-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚠️ Transaction Confirmation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deploy.session?.transfer && (
          <>
            <div>
              <p className="text-sm text-slate-400">Recipient</p>
              <p className="font-mono text-xs">{deploy.session.transfer.args.target}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Amount</p>
              <p className="text-2xl font-bold text-green-400">
                {Number(deploy.session.transfer.args.amount) / 1e9} CSPR
              </p>
            </div>
          </>
        )}

        {status === 'preview' && (
          <Button onClick={handleSign} className="w-full">
            Sign with CSPR.click →
          </Button>
        )}
        {status === 'signing' && (
          <p className="text-center text-yellow-400">Waiting for signature...</p>
        )}
        {status === 'success' && (
          <p className="text-center text-green-400 font-semibold">
            ✓ Transaction signed!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### NFT Gallery

```tsx
'use client';

import { Card } from '@/components/ui/card';
import Image from 'next/image';

export function NFTGallery({ nfts }: { nfts: any[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">NFT Portfolio ({nfts.length})</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {nfts.map((nft) => (
          <Card key={nft.token_id} className="overflow-hidden">
            <div className="aspect-square relative bg-slate-800">
              {nft.metadata?.image ? (
                <Image
                  src={nft.metadata.image}
                  alt={nft.metadata?.name || `NFT #${nft.token_id}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  No Image
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold truncate text-sm">
                {nft.metadata?.name || `#${nft.token_id}`}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Security

- **Never expose private keys**: All signing happens client-side via CSPR.click
- **Always preview transactions**: Show TransactionPreview before signing
- **Validate all inputs**: Use Zod schemas on both client and server
- **Rate limiting**: Protect API routes with rate limiting

### 2. Performance

- **React Server Components**: Use RSC for static content
- **Streaming**: Stream AI responses for better UX
- **Image optimization**: Next.js Image component
- **Database indexing**: Index conversation_id and userId

### 3. Error Handling

```tsx
export function ErrorMessage({ error }: { error: Error }) {
  return (
    <Card className="border-red-600/50 bg-red-900/10">
      <CardContent className="pt-6">
        <p className="text-red-400">❌ {error.message}</p>
      </CardContent>
    </Card>
  );
}
```

### 4. Accessibility

- **Keyboard navigation**: Full keyboard support
- **ARIA labels**: Proper semantic HTML
- **Color contrast**: WCAG AA compliance
- **Screen reader**: Test with screen readers

---

## Deployment

### Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
CASPER_NETWORK=testnet
CSPR_CLOUD_API_KEY=...
POSTGRES_URL=...
NEXT_PUBLIC_CASPER_NETWORK=testnet
```

### Build and Deploy

```bash
pnpm build
pnpm start
```

Deploy to Vercel for best Next.js experience and automatic edge deployment.

---

## Summary

**Key Innovations**:
1. **Generative UI**: AI generates custom React components, not just text
2. **Streaming**: Real-time progressive component rendering
3. **Tool-Based**: Each MCP tool maps to beautiful custom UI
4. **Secure**: Client-side wallet signing only

**Recommended Pattern**: `streamText` + `useChat` + tool-based rendering

This is a clean, production-ready architecture based entirely on official Vercel AI SDK patterns and Next.js best practices.

---

**Generated**: December 24, 2025
**Version**: 2.0 (Clean)
**Source**: Vercel AI SDK + Next.js 15 Documentation
