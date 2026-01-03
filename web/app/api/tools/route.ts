import { createMCPClient } from '@ai-sdk/mcp';

// Environment variables
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';

export async function GET() {
  try {
    // Connect to MCP server
    const mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: MCP_SERVER_URL,
      },
    });

    try {
      // Get all tools from MCP server
      const tools = await mcpClient.tools();
      console.log('[Tools API] Got tools from MCP:', Object.keys(tools).length, 'tools');

      // Convert tools object to array format for frontend
      const toolsArray = Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description || '',
        inputSchema: ('inputSchema' in tool ? tool.inputSchema : {}) || {},
      }));

      // Close MCP connection
      await mcpClient.close();

      return Response.json({ tools: toolsArray });
    } catch (error) {
      await mcpClient.close();
      throw error;
    }
  } catch (error) {
    console.error('[Tools API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tools';

    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
