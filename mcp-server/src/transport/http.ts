/**
 * HTTP Transport for MCP Server
 *
 * Provides Streamable HTTP transport for web frontend access.
 * This enables browsers to connect to the MCP server via HTTP.
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

export interface HttpTransportConfig {
  port?: number;
  corsOrigin?: string;
  serverName?: string;
  serverVersion?: string;
  network?: string;
  /** Function to register tools, resources, and prompts on new server instances */
  onServerCreated?: (server: McpServer) => void;
}

export interface HttpTransport {
  config: Required<Omit<HttpTransportConfig, 'onServerCreated'>> & Pick<HttpTransportConfig, 'onServerCreated'>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  app: Express;
}

/**
 * Create an HTTP transport for the MCP server
 */
export function createHttpTransport(config: HttpTransportConfig): HttpTransport {
  // Store active sessions - encapsulated per transport instance
  const sessions: Map<string, StreamableHTTPServerTransport> = new Map();

  const resolvedConfig = {
    port: config.port ?? 3001,
    // Accept multiple origins by default for development (ports 3000-3009)
    corsOrigin: config.corsOrigin ?? '*',
    serverName: config.serverName ?? 'casper-mcp-server',
    serverVersion: config.serverVersion ?? '1.0.0',
    network: config.network ?? 'testnet',
    onServerCreated: config.onServerCreated,
  };

  // Warn about wildcard CORS in production
  if (resolvedConfig.corsOrigin === '*') {
    console.warn('[MCP HTTP] WARNING: CORS is set to allow all origins (*). This is insecure for production.');
  }

  const app = express();
  let server: Server | null = null;

  // Parse JSON bodies with size limit to prevent DoS
  app.use(express.json({ limit: '1mb' }));

  // CORS middleware - supports multiple origins (comma-separated) or wildcard
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    let allowedOrigin = resolvedConfig.corsOrigin;

    // Handle multiple origins (comma-separated)
    if (resolvedConfig.corsOrigin !== '*' && origin) {
      const origins = resolvedConfig.corsOrigin.split(',').map(o => o.trim());
      if (origins.includes(origin)) {
        allowedOrigin = origin;
      }
    }

    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.header('Access-Control-Expose-Headers', 'mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }

    next();
  });

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      transport: 'http',
      server: resolvedConfig.serverName,
      version: resolvedConfig.serverVersion,
      network: resolvedConfig.network,
      activeSessions: sessions.size,
    });
  });

  // MCP endpoint - POST for sending messages
  app.post('/mcp', async (req: Request, res: Response) => {
    let transport: StreamableHTTPServerTransport | undefined;
    let newSessionId: string | undefined;

    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId && sessions.has(sessionId)) {
        // Reuse existing session
        transport = sessions.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New session initialization
        newSessionId = randomUUID();

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId!,
          enableJsonResponse: true,
          onsessioninitialized: (id: string) => {
            sessions.set(id, transport!);
          },
        });

        transport.onclose = () => {
          if (transport?.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };

        // Create MCP server for this session
        const mcpServer = new McpServer({
          name: resolvedConfig.serverName,
          version: resolvedConfig.serverVersion,
        });

        // Allow caller to register tools, resources, prompts
        if (resolvedConfig.onServerCreated) {
          try {
            resolvedConfig.onServerCreated(mcpServer);
          } catch (error) {
            console.error('[MCP POST] Failed to configure server:', error);
            throw new Error('Server configuration failed');
          }
        }

        await mcpServer.connect(transport);
      } else {
        // Invalid request - no session and not an initialize request
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session required: provide mcp-session-id header or send initialize request' },
          id: req.body?.id ?? null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      // Clean up partially created session
      if (newSessionId && sessions.has(newSessionId)) {
        sessions.delete(newSessionId);
      }

      console.error('[MCP POST] Request failed:', {
        sessionId: req.headers['mcp-session-id'],
        requestType: req.body?.method ?? 'unknown',
        error: error instanceof Error ? error.message : String(error),
      });

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: req.body?.id ?? null,
        });
      }
    }
  });

  // GET /mcp for SSE streams
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = sessions.get(sessionId);

    if (!transport) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session not found: the session may have expired or been closed' },
        id: null,
      });
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('[MCP GET] SSE request failed:', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Failed to establish SSE connection' },
          id: null,
        });
      }
    }
  });

  // DELETE /mcp to close session
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = sessions.get(sessionId);

    if (!transport) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session not found: cannot delete non-existent session' },
        id: null,
      });
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('[MCP DELETE] Session cleanup failed:', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Note: Session is deleted by transport.onclose handler, not manually here
  });

  // Global error handler - catches any unhandled errors
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('[MCP HTTP] Unhandled error:', {
      method: req.method,
      path: req.path,
      sessionId: req.headers['mcp-session-id'],
      error: err.message,
    });

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  });

  return {
    config: resolvedConfig,
    app,

    start: () => {
      return new Promise<void>((resolve, reject) => {
        server = app.listen(resolvedConfig.port, '0.0.0.0', () => {
          resolve();
        });

        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${resolvedConfig.port} is already in use`));
          } else if (err.code === 'EACCES') {
            reject(new Error(`Permission denied to bind to port ${resolvedConfig.port}`));
          } else {
            reject(err);
          }
        });
      });
    },

    stop: () => {
      return new Promise<void>((resolve, reject) => {
        if (!server) {
          resolve();
          return;
        }

        // Close all sessions with error handling
        const closeErrors: Array<{ sessionId: string; error: unknown }> = [];

        for (const [sessionId, transport] of sessions.entries()) {
          try {
            transport.close();
          } catch (error) {
            closeErrors.push({ sessionId, error });
          }
        }

        if (closeErrors.length > 0) {
          console.error('[MCP HTTP] Some sessions failed to close:', closeErrors);
        }

        sessions.clear();

        server.close((err) => {
          if (err) {
            console.error('[MCP HTTP] Server close failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
