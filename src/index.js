/**
 * Neural Memory MCP Server v2.0
 * Entry point principale del server MCP
 * 
 * CAMBIAMENTI v2.0:
 * - Session Management integrato
 * - Skills Framework
 * - Context Compression
 * - Reports HTML
 */

import { toolHandlers, toolDefinitions } from './tools/index.js';
import memoryService from './services/memory.js';

/**
 * Gestisce le richieste MCP
 */
async function handleMcpRequest(method, params) {
  const handler = toolHandlers[method];
  
  if (!handler) {
    return {
      success: false,
      content: [{ type: 'text', text: `Unknown method: ${method}` }]
    };
  }

  try {
    return await handler(params || {});
  } catch (error) {
    return {
      success: false,
      content: [{ type: 'text', text: `Error: ${error.message}` }]
    };
  }
}

/**
 * Lista tutti i tools disponibili
 */
function listTools() {
  return toolDefinitions.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));
}

/**
 * Ottiene la sessione attiva corrente
 */
function getActiveSession() {
  return memoryService.getActiveSession();
}

/**
 * Imposta la sessione attiva
 */
function setActiveSession(sessionId) {
  memoryService.setActiveSession(sessionId);
  return { success: true };
}

/**
 * Inizializza il servizio
 */
async function initialize() {
  await memoryService.ensureInitialized();
  return { success: true };
}

// Esporta per essere usato dal server MCP
export {
  handleMcpRequest,
  listTools,
  getActiveSession,
  setActiveSession,
  initialize,
  toolDefinitions,
  toolHandlers
};
