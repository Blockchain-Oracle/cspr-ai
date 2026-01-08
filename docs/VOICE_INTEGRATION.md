# Voice Integration for CSPR.AI - Implementation Guide

> **Status:** Planned Feature (Future Implementation)
> **Last Updated:** January 8, 2026
> **Technology Stack:** OpenAI Realtime API + MCP Integration

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Implementation Options](#implementation-options)
5. [Complete Setup Guide](#complete-setup-guide)
6. [Security Considerations](#security-considerations)
7. [Voice UX Best Practices](#voice-ux-best-practices)
8. [Resources](#resources)

---

## Overview

This document outlines how to integrate voice capabilities into the CSPR.AI MCP server, enabling users to interact with the Casper blockchain using natural voice commands.

### Key Capabilities

- **Voice-Activated Transactions**: Execute blockchain operations via spoken commands
- **Balance Queries**: "What's my wallet balance?"
- **Staking Commands**: "Stake 100 CSPR with validator X"
- **Transaction Confirmations**: Voice-based approval flow for security
- **Natural Conversation**: Multi-turn dialogues for complex operations

### The Solution

OpenAI's **Realtime API** + **Agents SDK** provides native support for both:
- Real-time bidirectional voice (Speech-to-Speech)
- MCP server integration
- Transaction approval workflows

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Voice-Enabled Application                 │
├─────────────────────────────────────────────────────────────┤
│  User's Microphone (Browser/Mobile)                         │
│         ↓                                                    │
│  RealtimeSession (WebRTC/WebSocket)                         │
│         ↓                                                    │
│  OpenAI Realtime API (gpt-realtime)                         │
│         ↓                                                    │
│  RealtimeAgent with MCP tools                               │
│         ↓                                                    │
│  CSPR.AI MCP Server (HTTP Transport)                        │
│         ↓                                                    │
│  Casper Network (Execute Transactions)                      │
│         ↓                                                    │
│  Voice Response to User                                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Voice Input** | Capture user's spoken commands | Browser MediaRecorder API |
| **Realtime API** | Process audio, understand intent | OpenAI gpt-realtime |
| **Agent** | Manage conversation, call tools | @openai/agents SDK |
| **MCP Integration** | Connect to existing CSPR.AI tools | MCPServerStdio / hostedMcpTool |
| **Approval Layer** | Confirm transactions before execution | Tool approval callbacks |
| **Voice Output** | Speak responses back to user | TTS (built into Realtime API) |

---

## Technology Stack

### Core Dependencies

```bash
npm install @openai/agents @openai/agents-realtime zod
```

### Architecture Choices

#### Option 1: Speech-to-Speech (Recommended for Voice UI)
- **Model:** `gpt-4o-realtime-preview` or `gpt-realtime`
- **Latency:** ~200-300ms (very low)
- **Flow:** Audio → AI → Audio (no intermediate text)
- **Best For:** Natural conversations, real-time interactions
- **Pros:** Most natural, lowest latency
- **Cons:** Less control over exact wording

#### Option 2: Chained Architecture (More Control)
- **Chain:** `gpt-4o-transcribe` → `gpt-4.1` → `gpt-4o-mini-tts`
- **Latency:** ~500-800ms
- **Flow:** Audio → Text → AI → Text → Audio
- **Best For:** When you need exact transcripts, audit trails
- **Pros:** Full transcript visibility, easier debugging
- **Cons:** Higher latency

### Transport Options

| Transport | Use Case | Browser Support |
|-----------|----------|-----------------|
| **WebRTC** | Browser-based apps | ✅ Chrome, Safari, Firefox |
| **WebSocket** | Server-side/backend | ✅ All platforms |
| **SIP** | VoIP/telephony | 📞 Phone systems |

---

## Implementation Options

### Option A: OpenAI Agents SDK (Recommended)

**Best for:** Full control, custom workflows, transaction approvals

```typescript
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { hostedMcpTool } from '@openai/agents';

// Connect to CSPR.AI MCP server
const mcpTools = hostedMcpTool({
  serverLabel: 'cspr-ai',
  serverUrl: 'https://mcp.cspr-ai.xyz/sse',
  requireApproval: 'always', // CRITICAL for transactions
});

// Create voice agent
const agent = new RealtimeAgent({
  name: 'CSPR Voice Assistant',
  instructions: `
    You are a voice-activated blockchain assistant for Casper Network.

    CRITICAL RULES:
    - Always confirm transaction details before executing
    - Repeat amounts and addresses back for verification
    - Never execute transactions without explicit "yes" or "confirm"
    - Speak clearly when dealing with numbers
  `,
  tools: [mcpTools],
});

// Start voice session
const session = new RealtimeSession(agent);
await session.connect({ apiKey: ephemeralKey });
```

### Option B: Hosted MCP (Simpler Setup)

**Best for:** Quick prototyping, hosted MCP servers

```typescript
import { Agent, hostedMcpTool, run } from '@openai/agents';

const agent = new Agent({
  name: 'CSPR Assistant',
  tools: [
    hostedMcpTool({
      serverLabel: 'cspr-ai',
      serverUrl: 'https://mcp.cspr-ai.xyz/sse',
      requireApproval: 'always',
    }),
  ],
});

const result = await run(agent, 'Check my CSPR balance');
```

---

## Complete Setup Guide

### Step 1: Install Dependencies

```bash
# Core voice libraries
npm install @openai/agents @openai/agents-realtime zod

# For Next.js integration (optional)
npm install next react react-dom
```

### Step 2: Generate Ephemeral Keys (Server-Side)

**IMPORTANT:** Never expose your OpenAI API key to the client. Generate ephemeral keys server-side.

```typescript
// app/server/token.action.ts
'use server';

export async function getToken(): Promise<string> {
  const response = await fetch(
    'https://api.openai.com/v1/realtime/client_secrets',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
        },
      }),
    }
  );

  const data = await response.json();
  return data.value; // Returns "ek_..."
}
```

**Or via cURL:**

```bash
curl -X POST https://api.openai.com/v1/realtime/client_secrets \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session": {
      "type": "realtime",
      "model": "gpt-realtime"
    }
  }'
```

### Step 3: Define MCP Tools for Voice

```typescript
import { tool } from '@openai/agents/realtime';
import { z } from 'zod';

// Transfer CSPR via voice
const transferTool = tool({
  name: 'casper_transfer',
  description: 'Transfer CSPR tokens to another address',
  parameters: z.object({
    to_address: z.string().describe('Recipient Casper address'),
    amount: z.number().describe('Amount in CSPR'),
  }),
  execute: async ({ to_address, amount }, context) => {
    // Call CSPR.AI MCP server
    const result = await fetch('https://mcp.cspr-ai.xyz/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'casper_build_transfer',
          arguments: {
            from_public_key: context.userPublicKey,
            to_public_key: to_address,
            amount_cspr: amount,
          },
        },
        id: 1,
      }),
    });

    const data = await result.json();
    return `Transfer of ${amount} CSPR to ${to_address} is ready for signing.`;
  },
  needsApproval: true, // CRITICAL: Require user confirmation
});

// Check balance via voice
const balanceTool = tool({
  name: 'check_balance',
  description: 'Check CSPR balance for a wallet',
  parameters: z.object({
    public_key: z.string().optional(),
  }),
  execute: async ({ public_key }) => {
    const result = await fetch('https://mcp.cspr-ai.xyz/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'casper_get_balance',
          arguments: { public_key },
        },
        id: 1,
      }),
    });

    const data = await result.json();
    return `Your balance is ${data.result.balance_cspr} CSPR`;
  },
});
```

### Step 4: Create Voice Agent

```typescript
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

const csprAgent = new RealtimeAgent({
  name: 'CSPR Voice Assistant',
  instructions: `
    You are a helpful voice assistant for Casper blockchain.

    TRANSACTION SAFETY RULES:
    1. Always repeat transaction details back to user
    2. Speak amounts clearly: "one hundred CSPR" not "100 CSPR"
    3. Confirm recipient address (read first 6 and last 4 characters)
    4. Wait for explicit "yes", "confirm", or "approve" before executing
    5. If user sounds uncertain, ask clarifying questions

    PERSONALITY:
    - Professional but friendly
    - Patient with technical terms
    - Clear enunciation of numbers and addresses
    - Proactive about security ("Let me confirm those details...")
  `,
  tools: [transferTool, balanceTool],
  model: 'gpt-realtime',
  voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
});

const session = new RealtimeSession(csprAgent);
```

### Step 5: Complete React Component

```typescript
'use client';

import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { useEffect, useRef, useState } from 'react';
import { getToken } from './server/token.action';

export default function VoiceUI() {
  const session = useRef<RealtimeSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [pendingApproval, setPendingApproval] = useState<any | null>(null);

  useEffect(() => {
    session.current = new RealtimeSession(csprAgent);

    // Track conversation
    session.current.on('history_updated', (history) => {
      setHistory(history);
    });

    // Handle transaction approvals
    session.current.on('tool_approval_requested', (ctx, agent, approval) => {
      setPendingApproval(approval);
    });

    return () => {
      session.current?.close();
    };
  }, []);

  async function connect() {
    if (isConnected) {
      await session.current?.close();
      setIsConnected(false);
    } else {
      const token = await getToken();
      await session.current?.connect({ apiKey: token });
      setIsConnected(true);
    }
  }

  async function toggleMute() {
    await session.current?.mute(!isMuted);
    setIsMuted(!isMuted);
  }

  function approveTransaction() {
    if (pendingApproval) {
      session.current?.approve(pendingApproval.approvalItem);
      setPendingApproval(null);
    }
  }

  function rejectTransaction() {
    if (pendingApproval) {
      session.current?.reject(pendingApproval.approvalItem);
      setPendingApproval(null);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Voice Blockchain Assistant</h1>

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={connect}
          className={`px-6 py-3 rounded-lg ${
            isConnected ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {isConnected ? 'Disconnect' : 'Start Talking'}
        </button>

        {isConnected && (
          <button
            onClick={toggleMute}
            className={`px-6 py-3 rounded-lg ${
              isMuted ? 'bg-yellow-600' : 'bg-blue-600'
            }`}
          >
            {isMuted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
        )}
      </div>

      {/* Status */}
      {isConnected && (
        <div className="mb-6 flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isMuted ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'
            }`}
          />
          <span>{isMuted ? 'Muted' : 'Listening...'}</span>
        </div>
      )}

      {/* Approval Modal */}
      {pendingApproval && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-white text-black p-8 rounded-xl max-w-md">
            <h2 className="text-xl font-bold mb-4">⚠️ Confirm Transaction</h2>
            <pre className="bg-gray-100 p-4 rounded mb-4 overflow-auto">
              {JSON.stringify(
                JSON.parse(pendingApproval.approvalItem.arguments || '{}'),
                null,
                2
              )}
            </pre>
            <div className="flex gap-4">
              <button
                onClick={approveTransaction}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg"
              >
                ✅ Approve
              </button>
              <button
                onClick={rejectTransaction}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-gray-100 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Conversation</h2>
        <div className="space-y-3">
          {history.map((item, i) => (
            <div
              key={i}
              className={`p-3 rounded ${
                item.role === 'user' ? 'bg-blue-100' : 'bg-gray-200'
              }`}
            >
              <strong>{item.role}:</strong>{' '}
              {item.content?.[0]?.text || '[audio]'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Security Considerations

### Transaction Approval Workflow

**CRITICAL:** Always require explicit approval for financial operations.

```typescript
const tool = tool({
  name: 'execute_transaction',
  needsApproval: true, // MANDATORY for transactions
  execute: async (params) => {
    // This only runs AFTER user approves
  },
});
```

### Voice Confirmation Pattern

Make the AI repeat transaction details:

```typescript
instructions: `
  Before executing any transaction:
  1. Say: "Let me confirm the details..."
  2. Repeat: amount, recipient, transaction type
  3. Ask: "Is this correct? Say yes to confirm or no to cancel."
  4. Wait for explicit "yes", "confirm", or "approve"
  5. If user says anything else, ask for clarification
`
```

### Guardrails for Large Transactions

```typescript
const guardrails = [
  {
    name: 'Large Transaction Warning',
    execute: async ({ agentOutput }) => {
      const amount = extractAmount(agentOutput);
      if (amount > 1000) {
        return {
          tripwireTriggered: true,
          outputInfo: {
            warning: 'Large transaction detected. Please confirm carefully.',
          },
        };
      }
      return { tripwireTriggered: false };
    },
  },
];
```

### Ephemeral Key Security

- ✅ Generate ephemeral keys server-side only
- ✅ Keys expire after session (typically 15-60 minutes)
- ✅ Keys cannot access your main API key
- ❌ Never expose `OPENAI_API_KEY` to client
- ❌ Never hardcode ephemeral keys

---

## Voice UX Best Practices

### 1. Clear Number Pronunciation

```typescript
instructions: `
  When speaking numbers:
  - Say "one hundred" not "100"
  - For decimals: "zero point five" not "0.5"
  - For addresses: spell first 6 and last 4 characters
  - Example: "zero one A B C D...E F G H"
`
```

### 2. Interruption Handling

```typescript
session.on('interrupted', () => {
  console.log('User interrupted AI speech');
  // AI automatically stops talking when user starts speaking
});
```

### 3. Error Recovery

```typescript
instructions: `
  If you don't understand:
  - Say "I didn't catch that. Could you repeat?"
  - Don't guess at numbers or addresses
  - Ask user to spell out if needed

  If transaction fails:
  - Explain the error in simple terms
  - Suggest next steps
  - Offer to retry
`
```

### 4. Ambient Noise Handling

```typescript
const session = new RealtimeSession(agent, {
  config: {
    audio: {
      input: {
        noiseSuppression: true,
        echoCancellation: true,
      },
    },
  },
});
```

---

## Integration with CSPR.AI

### Connecting to Existing MCP Server

#### Option A: Hosted MCP (Production)

```typescript
import { hostedMcpTool } from '@openai/agents';

const csprTools = hostedMcpTool({
  serverLabel: 'cspr-ai',
  serverUrl: 'https://mcp.cspr-ai.xyz/sse', // SSE endpoint
  requireApproval: 'always',
});
```

#### Option B: Local MCP (Development)

```typescript
import { MCPServerStdio } from '@openai/agents';

const mcpServer = new MCPServerStdio({
  name: 'CSPR.AI',
  command: 'node',
  args: ['/path/to/cspr-ai/mcp-server/dist/index.js'],
  env: {
    CASPER_NETWORK: 'testnet',
    MCP_TRANSPORT: 'stdio',
  },
});

await mcpServer.connect();

const agent = new RealtimeAgent({
  name: 'CSPR Assistant',
  mcpServers: [mcpServer],
});
```

### Available CSPR.AI Tools via Voice

All 50+ MCP tools become voice-accessible:

| Voice Command | MCP Tool | Example |
|---------------|----------|---------|
| "Check my balance" | `casper_get_balance` | "Your balance is 150 CSPR" |
| "Send 10 CSPR to address X" | `casper_build_transfer` | Builds unsigned transaction |
| "List validators" | `casper_get_validators` | Returns top 10 validators |
| "Stake 100 CSPR with validator Y" | `casper_build_delegation` | Builds staking transaction |
| "What's the status of deploy X" | `casper_get_deploy_status` | "Transaction succeeded" |
| "Deploy a new token called MyToken" | `casper_deploy_token` | Initiates token deployment |

---

## Project Structure

```
cspr-ai-voice/
├── app/
│   ├── voice/
│   │   └── page.tsx              # Main voice UI
│   └── server/
│       ├── token.action.ts       # Generate ephemeral keys
│       └── mcp.action.ts         # MCP tool handlers
├── components/
│   ├── VoiceControls.tsx         # Mic, mute, connect buttons
│   ├── ConversationHistory.tsx   # Chat display
│   └── ApprovalModal.tsx         # Transaction confirmation
├── lib/
│   ├── voice/
│   │   ├── agent.ts              # Agent configuration
│   │   ├── tools.ts              # Voice tool definitions
│   │   └── session.ts            # Session management
│   └── mcp/
│       └── client.ts             # MCP client wrapper
└── .env.local
    OPENAI_API_KEY=sk-...
    NEXT_PUBLIC_MCP_URL=https://mcp.cspr-ai.xyz
```

---

## Resources

### Official Documentation

- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Agents SDK (TypeScript)](https://openai.github.io/openai-agents-js/)
- [Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [MCP Integration](https://openai.github.io/openai-agents-js/guides/mcp/)
- [OpenAI MCP Connectors](https://platform.openai.com/docs/guides/tools-connectors-mcp)

### Code Examples

- [OpenAI Agents Examples](https://github.com/openai/openai-agents-js/tree/main/examples)
- [Realtime Voice Starter](https://github.com/openai/openai-realtime-console)

### Community Resources

- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Casper Network Docs](https://docs.casper.network/)
- [CSPR.AI Documentation](https://docs.cspr-ai.xyz)

---

## Next Steps

### Phase 1: Prototype (2-3 days)
- [ ] Set up OpenAI Realtime API access
- [ ] Create basic voice UI (connect/disconnect)
- [ ] Implement balance check via voice
- [ ] Test on localhost

### Phase 2: MCP Integration (3-5 days)
- [ ] Connect to CSPR.AI MCP server
- [ ] Implement transaction approval flow
- [ ] Add voice confirmation patterns
- [ ] Test with testnet transactions

### Phase 3: Production Ready (5-7 days)
- [ ] Add error handling and recovery
- [ ] Implement session persistence
- [ ] Add voice activity detection
- [ ] Deploy to production
- [ ] Security audit for transaction flows

### Phase 4: Advanced Features (Optional)
- [ ] Multi-language support
- [ ] Custom wake words ("Hey CSPR")
- [ ] Voice biometrics for auth
- [ ] Conversational analytics

---

## FAQ

### Q: Can I use Vercel AI SDK instead?
**A:** Vercel AI SDK is excellent for text streaming but doesn't have built-in real-time voice support. OpenAI's Agents SDK is purpose-built for voice interactions.

### Q: How much does this cost?
**A:** OpenAI Realtime API pricing:
- Audio input: $0.06 / minute
- Audio output: $0.24 / minute
- Text input/output: Standard GPT-4 pricing

Example: 10-minute voice session ≈ $3.00

### Q: Is this production-ready?
**A:** Yes, OpenAI Realtime API is in production. CSPR.AI would need:
- Robust error handling
- Transaction approval UI
- Rate limiting
- User authentication

### Q: Can I use this for phone calls?
**A:** Yes! Use SIP transport for telephony integration with services like Twilio or Vonage.

### Q: How do I handle wallet connections?
**A:** Integrate with CSPR.click wallet:
1. User connects wallet via browser extension
2. Store public key in session context
3. Pass to MCP tools for transaction building
4. User signs via CSPR.click when approving

---

## Conclusion

Voice integration with OpenAI's Realtime API provides a natural, accessible interface for blockchain interactions. Combined with CSPR.AI's comprehensive MCP tools, users can execute complex Casper Network operations using simple voice commands.

**Key Takeaways:**
- OpenAI Agents SDK has native MCP support
- Transaction approvals are built-in for security
- Low latency (~200-300ms) for natural conversations
- All existing CSPR.AI tools become voice-accessible
- Production-ready with proper security measures

For questions or implementation support, see [CSPR.AI documentation](https://docs.cspr-ai.xyz) or open an issue on GitHub.

---

**Document Version:** 1.0
**Author:** CSPR.AI Team
**Last Updated:** January 8, 2026
