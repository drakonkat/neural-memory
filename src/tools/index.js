/**
 * MCP Tools Definitions
 * Definisce tutti gli strumenti esposti dal server MCP
 */

const memoryService = require('../services/memory');

/**
 * Definisce tutti i tool MCP disponibili
 */
const tools = [
  // ===== STEP 1: MVP BASE =====
  {
    name: 'initialize_project',
    description: 'Inizializza un nuovo progetto di memoria. Ogni progetto ha il proprio database SQLite.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nome del progetto (es: "my-app", "neural-memory")'
        },
        path: {
          type: 'string',
          description: 'Percorso del progetto (es: "/path/to/project")'
        },
        description: {
          type: 'string',
          description: 'Descrizione opzionale del progetto',
          default: ''
        }
      },
      required: ['name', 'path']
    },
    handler: async ({ name, path, description }) => {
      try {
        const result = await memoryService.initializeProject(name, path, description);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  {
    name: 'add_node',
    description: 'Aggiunge un nodo alla memoria del progetto. Usa keywords per facilitare la ricerca futura.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID del progetto'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array di keywords per identificare il nodo (es: ["entity", "database", "User"])',
          default: []
        },
        content: {
          type: 'string',
          description: 'Contenuto long-text descrittivo del task/azione'
        },
        type: {
          type: 'string',
          enum: ['task', 'entity', 'file', 'concept', 'summary', 'action', 'generic'],
          description: 'Tipo di nodo',
          default: 'generic'
        },
        parent_id: {
          type: 'string',
          description: 'ID del nodo padre (per gerarchia)',
          default: null
        },
        weight: {
          type: 'number',
          description: 'Peso per il ranking (0.1 - 10.0)',
          default: 1.0
        },
        metadata: {
          type: 'object',
          description: 'Metadati aggiuntivi (es: { files: [], actions: [] })',
          default: {}
        }
      },
      required: ['project_id']
    },
    handler: async ({ project_id, keywords, content, type, parent_id, weight, metadata }) => {
      try {
        const result = await memoryService.addNode({
          projectId: project_id,
          keywords: keywords || [],
          content: content || '',
          type: type || 'generic',
          parentId: parent_id,
          weight: weight || 1.0,
          metadata: metadata || {}
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  {
    name: 'search_nodes',
    description: 'Cerca nodi nella memoria usando keywords. Restituisce risultati con confidence score.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID del progetto'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords da cercare',
          default: []
        },
        max_results: {
          type: 'number',
          description: 'Numero massimo di risultati',
          default: 10
        },
        min_confidence: {
          type: 'number',
          description: 'Confidenza minima (0.0 - 1.0)',
          default: 0.1
        },
        type: {
          type: 'string',
          description: 'Filtra per tipo di nodo',
          default: null
        }
      },
      required: ['project_id', 'keywords']
    },
    handler: async ({ project_id, keywords, max_results, min_confidence, type }) => {
      try {
        const results = await memoryService.searchNodes({
          projectId: project_id,
          keywords: keywords || [],
          maxResults: max_results || 10,
          minConfidence: min_confidence || 0.1,
          type: type || null
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  // ===== STEP 2: NAVIGAZIONE =====
  {
    name: 'get_node_context',
    description: 'Ottiene il contesto di un nodo: genitori, figli, collegamenti e percorsi.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID del progetto'
        },
        node_id: {
          type: 'string',
          description: 'ID del nodo'
        },
        depth: {
          type: 'number',
          description: 'Profondità di navigazione (1-3)',
          default: 1
        }
      },
      required: ['project_id', 'node_id']
    },
    handler: async ({ project_id, node_id, depth }) => {
      try {
        const result = await memoryService.getNodeContext({
          projectId: project_id,
          nodeId: node_id,
          depth: depth || 1
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  {
    name: 'get_project_stats',
    description: 'Ottiene statistiche del progetto: numero nodi, tipi, ultima attività.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID del progetto'
        }
      },
      required: ['project_id']
    },
    handler: async ({ project_id }) => {
      try {
        const result = await memoryService.getProjectStats(project_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  // ===== STEP 3: LINKING =====
  {
    name: 'link_nodes',
    description: 'Crea un collegamento tra due nodi.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID del progetto'
        },
        from_node_id: {
          type: 'string',
          description: 'ID del nodo sorgente'
        },
        to_node_id: {
          type: 'string',
          description: 'ID del nodo destinazione'
        },
        link_type: {
          type: 'string',
          enum: ['child', 'parent', 'related', 'reference', 'trigger', 'caused'],
          description: 'Tipo di collegamento',
          default: 'related'
        },
        weight: {
          type: 'number',
          description: 'Peso del collegamento',
          default: 1.0
        }
      },
      required: ['project_id', 'from_node_id', 'to_node_id']
    },
    handler: async ({ project_id, from_node_id, to_node_id, link_type, weight }) => {
      try {
        const result = await memoryService.linkNodes({
          projectId: project_id,
          fromNodeId: from_node_id,
          toNodeId: to_node_id,
          linkType: link_type || 'related',
          weight: weight || 1.0
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  {
    name: 'suggest_nodes',
    description: 'Suggerisce nodi rilevanti basati su keywords correnti.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID del progetto'
        },
        current_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords del contesto attuale',
          default: []
        },
        max_results: {
          type: 'number',
          description: 'Numero massimo di suggerimenti',
          default: 5
        }
      },
      required: ['project_id']
    },
    handler: async ({ project_id, current_keywords, max_results }) => {
      try {
        const result = await memoryService.suggestNodes({
          projectId: project_id,
          currentKeywords: current_keywords || [],
          maxResults: max_results || 5
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  // ===== STEP 4: MANAGEMENT =====
  {
    name: 'update_node',
    description: 'Aggiorna un nodo esistente.',
    inputSchema: {
      type: 'object',
      properties: {
        node_id: {
          type: 'string',
          description: 'ID del nodo da aggiornare'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Nuove keywords'
        },
        content: {
          type: 'string',
          description: 'Nuovo contenuto'
        },
        weight: {
          type: 'number',
          description: 'Nuovo peso'
        },
        metadata: {
          type: 'object',
          description: 'Nuovi metadati'
        }
      },
      required: ['node_id']
    },
    handler: async ({ node_id, keywords, content, weight, metadata }) => {
      try {
        const result = await memoryService.updateNode({
          nodeId: node_id,
          keywords,
          content,
          weight,
          metadata
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  },

  {
    name: 'delete_node',
    description: 'Elimina un nodo. Con cascade=true elimina anche i figli.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID del progetto'
        },
        node_id: {
          type: 'string',
          description: 'ID del nodo da eliminare'
        },
        cascade: {
          type: 'boolean',
          description: 'Elimina anche i nodi figli',
          default: false
        }
      },
      required: ['project_id', 'node_id']
    },
    handler: async ({ project_id, node_id, cascade }) => {
      try {
        const result = await memoryService.deleteNode({
          projectId: project_id,
          nodeId: node_id,
          cascade: cascade || false
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    }
  }
];

/**
 * Converte i tool nel formato MCP SDK
 */
function getMcpTools() {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));
}

/**
 * Esegue un tool
 */
async function executeTool(name, args) {
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Tool not found: ${name}` }],
      isError: true
    };
  }
  return await tool.handler(args);
}

module.exports = {
  tools,
  getMcpTools,
  executeTool
};
