#!/usr/bin/env node
/**
 * Neural Memory MCP Server
 * Server MCP per memoria persistente e organizzata per agenti AI
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

// Crea istanza server con nuovo pattern
const server = new McpServer({
  name: "neural-memory",
  version: "1.0.0",
});

// Registra tutti i tool
const registeredTools = registerAllTools(server);

// Avvio server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Neural Memory MCP Server started!");
  console.error("Available tools:");
  registeredTools.forEach(t => {
    console.error(`  - ${t.name}: ${t.description.substring(0, 60)}...`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
