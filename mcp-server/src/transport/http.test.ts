/**
 * HTTP Transport Tests
 *
 * Tests for the Streamable HTTP transport that enables web frontend access.
 * Following TDD: These tests are written BEFORE implementation.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// These imports will fail until we implement the module
import { createHttpTransport, type HttpTransportConfig } from './http.js';

describe('HTTP Transport', () => {
  describe('createHttpTransport', () => {
    it('should return an object with start and stop methods', () => {
      const transport = createHttpTransport({ port: 3001 });

      expect(transport).toBeDefined();
      expect(typeof transport.start).toBe('function');
      expect(typeof transport.stop).toBe('function');
    });

    it('should accept port configuration', () => {
      const transport = createHttpTransport({ port: 4000 });

      expect(transport.config.port).toBe(4000);
    });

    it('should use default port 3001 when not specified', () => {
      const transport = createHttpTransport({});

      expect(transport.config.port).toBe(3001);
    });

    it('should accept CORS origin configuration', () => {
      const transport = createHttpTransport({
        port: 3001,
        corsOrigin: 'http://localhost:3000',
      });

      expect(transport.config.corsOrigin).toBe('http://localhost:3000');
    });
  });

  describe('Health Endpoint', () => {
    let transport: ReturnType<typeof createHttpTransport>;
    const TEST_PORT = 3099;

    beforeAll(async () => {
      transport = createHttpTransport({ port: TEST_PORT });
      await transport.start();
    });

    afterAll(async () => {
      await transport.stop();
    });

    it('should respond to GET /health with status ok', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    });

    it('should include transport type in health response', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/health`);
      const data = await response.json();

      expect(data.transport).toBe('http');
    });
  });

  describe('CORS', () => {
    let transport: ReturnType<typeof createHttpTransport>;
    const TEST_PORT = 3098;

    beforeAll(async () => {
      transport = createHttpTransport({
        port: TEST_PORT,
        corsOrigin: 'http://localhost:3000',
      });
      await transport.start();
    });

    afterAll(async () => {
      await transport.stop();
    });

    it('should include CORS headers in response', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/health`, {
        headers: { Origin: 'http://localhost:3000' },
      });

      expect(response.headers.get('access-control-allow-origin')).toBe(
        'http://localhost:3000'
      );
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-methods')).toContain(
        'POST'
      );
    });
  });

  describe('MCP Endpoint', () => {
    let transport: ReturnType<typeof createHttpTransport>;
    const TEST_PORT = 3097;

    beforeAll(async () => {
      transport = createHttpTransport({ port: TEST_PORT });
      await transport.start();
    });

    afterAll(async () => {
      await transport.stop();
    });

    it('should respond to POST /mcp', async () => {
      // MCP initialize request
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      };

      const response = await fetch(`http://localhost:${TEST_PORT}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify(initRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jsonrpc).toBe('2.0');
      expect(data.id).toBe(1);
    });

    it('should return session ID header on initialize', async () => {
      const initRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      };

      const response = await fetch(`http://localhost:${TEST_PORT}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify(initRequest),
      });

      const sessionId = response.headers.get('mcp-session-id');
      expect(sessionId).toBeDefined();
      expect(sessionId).not.toBeNull();
      expect(typeof sessionId).toBe('string');
    });

    it('should reject non-initialize requests without session', async () => {
      const listToolsRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {},
      };

      const response = await fetch(`http://localhost:${TEST_PORT}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listToolsRequest),
      });

      expect(response.status).toBe(400);
    });
  });
});
