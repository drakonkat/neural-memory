/**
 * Neural Memory MCP Server
 * Server MCP per memoria persistente e organizzata per agenti AI
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  InitializeRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const { getMcpTools, executeTool } = require('./tools');
const memoryService = require('./services/memory');

// Crea istanza server
const server = new Server(
  {
    name: 'neural-memory',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Gestisci inizializzazione
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'neural-memory',
      version: '1.0.0',
    },
  };
});

// Gestisci lista tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getMcpTools()
  };
});

// Gestisci chiamata tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await executeTool(name, args || {});
    return result;
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Avvio server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Neural Memory MCP Server started!');
  console.error('Available tools:');
  getMcpTools().forEach(t => {
    console.error(`  - ${t.name}: ${t.description.substring(0, 60)}...`);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
