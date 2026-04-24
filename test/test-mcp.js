/**
 * Test di Integrazione MCP
 * Verifica che il server risponda correttamente al protocollo MCP
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, "../src/index.js");

async function runTest() {
  console.log("🧪 Avvio test di integrazione MCP...");

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log("✅ Connesso al server MCP");

    // 1. Verifica Tools
    const tools = await client.listTools();
    console.log(`✅ Ricevuti ${tools.tools.length} tool`);
    
    const requiredTools = ["start_session", "add_node", "search_nodes"];
    for (const toolName of requiredTools) {
      if (tools.tools.find(t => t.name === toolName)) {
        console.log(`   ✓ Tool '${toolName}' presente`);
      } else {
        throw new Error(`Tool '${toolName}' mancante!`);
      }
    }

    // 2. Test Call Tool: start_session
    console.log("📡 Esecuzione tool: start_session...");
    const sessionResult = await client.callTool({
      name: "start_session",
      arguments: {
        name: "test-mcp-integration",
        description: "Test automatizzato integrazione MCP"
      }
    });

    if (sessionResult.isError) {
      throw new Error(`Errore start_session: ${JSON.stringify(sessionResult.content)}`);
    }

    const sessionData = JSON.parse(sessionResult.content[0].text);
    const sessionId = sessionData.session_id;
    console.log(`✅ Sessione creata: ${sessionId}`);

    // 3. Test Call Tool: add_node
    console.log("📡 Esecuzione tool: add_node...");
    const nodeResult = await client.callTool({
      name: "add_node",
      arguments: {
        sessionId: sessionId,
        keywords: ["test", "mcp", "integration"],
        content: "Nodo di test creato via client MCP",
        type: "task"
      }
    });

    if (nodeResult.isError) {
      throw new Error(`Errore add_node: ${JSON.stringify(nodeResult.content)}`);
    }
    console.log("✅ Nodo creato con successo");

    console.log("\n🎉 Test di integrazione MCP completato con successo!");
  } catch (error) {
    console.error("\n❌ Test fallito:");
    console.error(error);
    process.exit(1);
  } finally {
    await transport.close();
  }
}

runTest();
