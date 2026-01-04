import { createMCPClient } from '@ai-sdk/mcp';
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { addMessage } from '@/lib/actions/conversations';

// Environment variables
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';

// System prompt for the CSPR.AI assistant
const SYSTEM_PROMPT = `You are CSPR.AI, an AI assistant specialized in the Casper blockchain ecosystem.

You have access to tools that can:
- Query account balances and information
- Look up validators and staking data
- Check transaction/deploy status
- Explore NFTs and token holdings
- Query smart contracts (CEP-18 tokens, NFT collections, DAO contracts)
- Get network statistics and state

Guidelines:
1. Use the available tools to fetch real-time blockchain data when answering questions
2. Be concise but informative in your responses
3. When showing CSPR amounts, format them appropriately (1 CSPR = 1,000,000,000 motes)
4. Always verify data by calling the appropriate tools rather than making assumptions
5. If a tool returns an error, explain what went wrong and suggest alternatives

You're helpful, accurate, and focused on providing real Casper blockchain insights.`;

export async function POST(req: Request) {
  try {
    const { messages: rawMessages, conversationId } = await req.json();

    // Debug: log received messages
    console.log('[Chat API] Raw messages received:', rawMessages?.length || 0, 'messages');
    console.log('[Chat API] Conversation ID:', conversationId);

    // Validate messages
    if (!rawMessages || !Array.isArray(rawMessages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert UIMessages to ModelMessages using the SDK's built-in function
    // This properly handles tool calls, parts, and all message types
    const modelMessages = await convertToModelMessages(rawMessages);
    console.log('[Chat API] Converted to', modelMessages.length, 'model messages');

    // Connect to MCP server using HTTP transport
    const mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: MCP_SERVER_URL,
      },
    });

    try {
      // Get all tools from MCP server
      const allTools = await mcpClient.tools();

      // Filter out tools with schemas incompatible with OpenAI
      // casper_sign_and_submit_transaction has tuple types in its schema that OpenAI rejects
      // This tool is not needed in frontend anyway - signing is done via CSPR.click wallet
      const toolsToExclude = ['casper_sign_and_submit_transaction', 'casper_wallet_status'];
      const tools = Object.fromEntries(
        Object.entries(allTools).filter(([name]) => !toolsToExclude.includes(name))
      );
      console.log('[Chat API] Got', Object.keys(tools).length, 'tools from MCP (excluded:', toolsToExclude.join(', '), ')');

      // Stream AI response with MCP tools
      const result = streamText({
        model: openai('gpt-4o'),
        system: SYSTEM_PROMPT,
        messages: modelMessages,
        tools,
        onError: async (error: any) => {
          console.error('[Chat API] Stream error:', error);
          await mcpClient.close();
        },
      });

      // Consume stream to ensure it runs to completion even if client disconnects
      // This is critical for the onFinish callback to be triggered reliably
      result.consumeStream();

      // Return UI message stream response with server-side persistence
      return result.toUIMessageStreamResponse({
        originalMessages: rawMessages,
        onFinish: async ({ messages }) => {
          console.log('[Chat API] Stream finished, persisting messages');
          await mcpClient.close();

          // Persist the assistant message if we have a conversation ID
          if (conversationId && messages && messages.length > 0) {
            // The last message is the new assistant response
            const assistantMessage = messages[messages.length - 1];

            if (assistantMessage && assistantMessage.role === 'assistant') {
              console.log('[Chat API] Persisting assistant message:', {
                id: assistantMessage.id,
                partsCount: assistantMessage.parts?.length || 0,
                partsTypes: assistantMessage.parts?.map((p: any) => ({
                  type: p.type,
                  state: p.state,
                  hasOutput: !!p.output,
                })),
              });

              // Extract text content from parts
              const textContent = assistantMessage.parts
                ?.filter((p: any) => p.type === 'text')
                .map((p: any) => p.text)
                .join('') || '';

              // Extract tool results from parts (handles multiple SDK formats)
              const toolResults = assistantMessage.parts
                ?.filter((part: any) => {
                  if (part.type === 'tool-result') return true;
                  if (part.type === 'dynamic-tool' && part.state === 'output-available') return true;
                  if (part.type?.startsWith('tool-') && part.type !== 'tool-result' && part.state === 'output-available') return true;
                  return false;
                })
                .map((part: any) => ({
                  toolCallId: part.toolCallId || 'unknown',
                  toolName: part.toolName || 'unknown',
                  result: part.result ?? part.output,
                  isError: part.isError || part.state === 'output-error' || false,
                })) || [];

              try {
                await addMessage({
                  conversationId,
                  role: 'assistant',
                  content: textContent,
                  parts: assistantMessage.parts as any,
                  toolResults: toolResults.length > 0 ? toolResults : undefined,
                });
                console.log('[Chat API] Assistant message persisted successfully');
              } catch (error) {
                console.error('[Chat API] Failed to persist assistant message:', error);
              }
            }
          }
        },
      });

    } catch (error) {
      await mcpClient.close();
      throw error;
    }
  } catch (error) {
    console.error('[Chat API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
