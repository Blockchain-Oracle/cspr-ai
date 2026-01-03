'use client';

/**
 * React hook for MCP client connection
 *
 * DO NOT MODIFY - Claude manages this file
 */

import { useState, useEffect, useCallback } from 'react';
import { getMCPClient, MCPClient } from '@/lib/mcp-client';
import type { MCPTool, MCPSession } from '@/lib/types';

export interface UseMCPClientReturn {
  session: MCPSession;
  tools: MCPTool[];
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export function useMCPClient(): UseMCPClientReturn {
  const [client] = useState<MCPClient>(() => getMCPClient());
  const [session, setSession] = useState<MCPSession>({
    sessionId: '',
    isConnected: false,
    serverInfo: null,
  });
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (client.isConnected()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { sessionId, serverInfo } = await client.initialize();
      setSession({
        sessionId,
        isConnected: true,
        serverInfo,
      });

      const toolList = await client.listTools();
      setTools(toolList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setSession({
        sessionId: '',
        isConnected: false,
        serverInfo: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const disconnect = useCallback(async () => {
    try {
      await client.close();
      setSession({
        sessionId: '',
        isConnected: false,
        serverInfo: null,
      });
      setTools([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [client]);

  const callTool = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      if (!client.isConnected()) {
        throw new Error('Not connected to MCP server');
      }

      const result = await client.callTool(name, args);
      if (result.isError) {
        throw new Error(String(result.result));
      }
      return result.result;
    },
    [client]
  );

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    session,
    tools,
    isLoading,
    error,
    connect,
    disconnect,
    callTool,
  };
}
