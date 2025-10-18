import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config.js';
import { AmazonClient } from './clients/amazon.js';
import { registerSearchProductsTool } from './tools/search-products.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const server = new McpServer({
    name: 'amazon-shopping-mcp',
    version: '0.1.0'
  });

  const client = new AmazonClient(config);

  registerSearchProductsTool(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start Amazon MCP server:', error);
  process.exitCode = 1;
});
