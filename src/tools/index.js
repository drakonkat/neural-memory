/**
 * MCP Tools Definitions
 * Definisce tutti gli strumenti esposti dal server MCP
 * Usa il nuovo pattern McpServer.tool() con Zod
 */

import { z } from "zod";
import memoryService from "../services/memory.js";

/**
 * Tool definitions con schema Zod
 */
const toolDefinitions = [
  // ===== STEP 1: MVP BASE =====
  {
    name: "initialize_project",
    description: "Inizializza un nuovo progetto di memoria. Ogni progetto ha il proprio database SQLite.",
    schema: {
      name: z.string().describe("Nome del progetto (es: 'my-app', 'neural-memory')"),
      path: z.string().describe("Percorso del progetto (es: '/path/to/project')"),
      description: z.string().optional().describe("Descrizione opzionale del progetto"),
    },
  },

  {
    name: "add_node",
    description: "Aggiunge un nodo alla memoria del progetto. Usa keywords per facilitare la ricerca futura.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
      keywords: z.array(z.string()).optional().describe("Array di keywords per identificare il nodo"),
      content: z.string().optional().describe("Contenuto long-text descrittivo del task/azione"),
      type: z.enum(["task", "entity", "file", "concept", "summary", "action", "generic"]).optional().describe("Tipo di nodo"),
      parent_id: z.string().nullable().optional().describe("ID del nodo padre (per gerarchia)"),
      weight: z.number().optional().describe("Peso per il ranking (0.1 - 10.0)"),
      metadata: z.record(z.unknown()).optional().describe("Metadati aggiuntivi"),
    },
  },

  {
    name: "search_nodes",
    description: "Cerca nodi nella memoria usando keywords. Restituisce risultati con confidence score.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
      keywords: z.array(z.string()).describe("Keywords da cercare"),
      max_results: z.number().optional().describe("Numero massimo di risultati"),
      min_confidence: z.number().optional().describe("Confidenza minima (0.0 - 1.0)"),
      type: z.string().optional().describe("Filtra per tipo di nodo"),
    },
  },

  // ===== STEP 2: NAVIGAZIONE =====
  {
    name: "get_node_context",
    description: "Ottiene il contesto di un nodo: genitori, figli, collegamenti e percorsi.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
      node_id: z.string().describe("ID del nodo"),
      depth: z.number().optional().describe("Profondità di navigazione (1-3)"),
    },
  },

  {
    name: "get_project_stats",
    description: "Ottiene statistiche del progetto: numero nodi, tipi, ultima attività.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
    },
  },

  // ===== STEP 3: LINKING =====
  {
    name: "link_nodes",
    description: "Crea un collegamento tra due nodi.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
      from_node_id: z.string().describe("ID del nodo sorgente"),
      to_node_id: z.string().describe("ID del nodo destinazione"),
      link_type: z.enum(["child", "parent", "related", "reference", "trigger", "caused"]).optional().describe("Tipo di collegamento"),
      weight: z.number().optional().describe("Peso del collegamento"),
    },
  },

  {
    name: "suggest_nodes",
    description: "Suggerisce nodi rilevanti basati su keywords correnti.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
      current_keywords: z.array(z.string()).optional().describe("Keywords del contesto attuale"),
      max_results: z.number().optional().describe("Numero massimo di suggerimenti"),
    },
  },

  // ===== STEP 4: MANAGEMENT =====
  {
    name: "update_node",
    description: "Aggiorna un nodo esistente.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
      node_id: z.string().describe("ID del nodo da aggiornare"),
      keywords: z.array(z.string()).optional().describe("Nuove keywords"),
      content: z.string().optional().describe("Nuovo contenuto"),
      weight: z.number().optional().describe("Nuovo peso"),
      metadata: z.record(z.unknown()).optional().describe("Nuovi metadati"),
    },
  },

  {
    name: "delete_node",
    description: "Elimina un nodo. Con cascade=true elimina anche i figli.",
    schema: {
      project_id: z.string().describe("ID del progetto"),
      node_id: z.string().describe("ID del nodo da eliminare"),
      cascade: z.boolean().optional().describe("Elimina anche i nodi figli"),
    },
  },
];

/**
 * Handler per ogni tool - mappa nome -> logica
 */
const toolHandlers = {
  async initialize_project({ name, path, description = "" }) {
    const result = await memoryService.initializeProject(name, path, description);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },

  async add_node({ project_id, keywords = [], content = "", type = "generic", parent_id = null, weight = 1.0, metadata = {} }) {
    const result = await memoryService.addNode({
      projectId: project_id,
      keywords,
      content,
      type,
      parentId: parent_id,
      weight,
      metadata,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },

  async search_nodes({ project_id, keywords = [], max_results = 10, min_confidence = 0.1, type = null }) {
    const results = await memoryService.searchNodes({
      projectId: project_id,
      keywords,
      maxResults: max_results,
      minConfidence: min_confidence,
      type,
    });
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  },

  async get_node_context({ project_id, node_id, depth = 1 }) {
    const result = await memoryService.getNodeContext({ projectId: project_id, nodeId: node_id, depth });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },

  async get_project_stats({ project_id }) {
    const result = await memoryService.getProjectStats(project_id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },

  async link_nodes({ project_id, from_node_id, to_node_id, link_type = "related", weight = 1.0 }) {
    const result = await memoryService.linkNodes({
      projectId: project_id,
      fromNodeId: from_node_id,
      toNodeId: to_node_id,
      linkType: link_type,
      weight,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },

  async suggest_nodes({ project_id, current_keywords = [], max_results = 5 }) {
    const result = await memoryService.suggestNodes({
      projectId: project_id,
      currentKeywords: current_keywords,
      maxResults: max_results,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },

  async update_node({ project_id, node_id, keywords, content, weight, metadata }) {
    const result = await memoryService.updateNode({
      projectId: project_id,
      nodeId: node_id,
      keywords,
      content,
      weight,
      metadata,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },

  async delete_node({ project_id, node_id, cascade = false }) {
    const result = await memoryService.deleteNode({
      projectId: project_id,
      nodeId: node_id,
      cascade,
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
};

/**
 * Registra tutti i tool su un server McpServer
 * @param {McpServer} server - Istanza del server MCP
 * @returns {Array} Lista dei tool registrati
 */
export function registerAllTools(server) {
  const registeredTools = [];

  for (const tool of toolDefinitions) {
    server.tool(tool.name, tool.description, tool.schema, async (args) => {
      try {
        const handler = toolHandlers[tool.name];
        if (!handler) {
          return { content: [{ type: "text", text: `Handler not found for tool: ${tool.name}` }], isError: true };
        }
        return await handler(args);
      } catch (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    });

    registeredTools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema,
    });
  }

  return registeredTools;
}

/**
 * Get tools metadata (per debugging/info)
 */
export function getToolsMetadata() {
  return toolDefinitions.map(t => ({
    name: t.name,
    description: t.description,
  }));
}
