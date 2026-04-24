/**
 * MCP Tools v2.0
 * Strumenti per il Memory Neural Network MCP Server
 * 
 * CAMBIAMENTI v2.0:
 * - Session Management (start, resume, end session)
 * - Skills Framework con schema rigido
 * - Context Compression
 * - Reports HTML
 */

import memoryService from '../services/memory.js';
import { z } from 'zod';

/**
 * Tool: start_session
 * Inizia una nuova sessione di lavoro
 */
async function startSession({ name, description, tags, projectPath, initialContext }) {
  try {
    const result = await memoryService.startSession({
      name,
      description: description || '',
      tags: tags || [],
      projectPath: projectPath || null,
      initialContext: initialContext || {}
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: resume_session
 * Riprende una sessione esistente
 */
async function resumeSession({ sessionId }) {
  try {
    const result = await memoryService.resumeSession(sessionId);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: end_session
 * Chiude la sessione attuale
 */
async function endSession({ sessionId }) {
  try {
    const result = await memoryService.endSession(sessionId);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: list_sessions
 * Lista sessioni con filtri
 */
async function listSessions({ limit, includeEnded, tags, projectPath }) {
  try {
    const result = await memoryService.listSessions({
      limit: limit || 20,
      includeEnded: includeEnded || false,
      tags: tags || [],
      projectPath: projectPath || null
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: add_node
 * Aggiunge un nodo alla memoria
 */
async function addNode({ sessionId, keywords, content, type, parentId, metadata, weight }) {
  try {
    const result = await memoryService.addNode({
      sessionId: sessionId || null,
      keywords: keywords || [],
      content: content || '',
      type: type || 'generic',
      parentId: parentId || null,
      metadata: metadata || {},
      weight: weight || 1.0
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: search_nodes
 * Cerca nodi per keywords
 */
async function searchNodes({ keywords, maxResults, minConfidence, type, sessionId }) {
  try {
    const result = await memoryService.searchNodes({
      keywords: keywords || [],
      maxResults: maxResults || 10,
      minConfidence: minConfidence || 0.1,
      type: type || null,
      sessionId: sessionId || null
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: get_node_context
 * Ottiene contesto di un nodo
 */
async function getNodeContext({ nodeId, depth }) {
  try {
    const result = await memoryService.getNodeContext({
      nodeId,
      depth: depth || 1
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: link_nodes
 * Collega due nodi
 */
async function linkNodes({ fromNodeId, toNodeId, linkType, weight }) {
  try {
    const result = await memoryService.linkNodes({
      fromNodeId,
      toNodeId,
      linkType: linkType || 'related',
      weight: weight || 1.0
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: update_node
 * Aggiorna un nodo
 */
async function updateNode({ nodeId, keywords, content, metadata, weight }) {
  try {
    const result = await memoryService.updateNode({
      nodeId,
      keywords,
      content,
      metadata,
      weight
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: delete_node
 * Elimina un nodo
 */
async function deleteNode({ nodeId, cascade }) {
  try {
    const result = await memoryService.deleteNode({
      nodeId,
      cascade: cascade || false
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: register_skill
 * Registra una skill con schema rigido (v2.0)
 * 
 * Schema richiesto:
 * - name: nome della skill
 * - framework: framework (es. "fastify", "react", "prisma")
 * - language: linguaggio (es. "javascript", "typescript", "python")
 * - filePattern: pattern file (es. "*.service.js", "**\/*.controller.ts")
 * - learnSteps: array di passi per imparare la skill
 * - useCases: array di casi d'uso
 * - implementation: implementazione dettagliata (opzionale)
 * - examples: esempi pratici (opzionale)
 * - prerequisites: prerequisiti (opzionale)
 * - keywords: keywords aggiuntive (opzionale)
 */
async function registerSkill({ name, framework, language, filePattern, learnSteps, useCases, implementation, examples, prerequisites, keywords, content }) {
  try {
    const result = await memoryService.registerSkill({
      name,
      framework: framework || '',
      language: language || '',
      filePattern: filePattern || '',
      learnSteps: learnSteps || [],
      useCases: useCases || [],
      implementation: implementation || '',
      examples: examples || [],
      prerequisites: prerequisites || [],
      keywords: keywords || [],
      content: content || ''
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: apply_skill
 * Applica/suggerisci skill basata su keywords
 */
async function applySkill({ keywords, context, domain }) {
  try {
    const result = await memoryService.applySkill({
      keywords: keywords || [],
      context: context || '',
      domain: domain || null
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: suggest_skills
 * Suggerisci skills basate su contesto
 */
async function suggestSkills({ currentKeywords, maxResults, domain }) {
  try {
    const result = await memoryService.suggestSkills({
      currentKeywords: currentKeywords || [],
      maxResults: maxResults || 5,
      domain: domain || null
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: save_context_snapshot
 * Salva snapshot contesto dettagliato
 */
async function saveContextSnapshot({ sessionId, summary, workDone, pendingTasks, keyDecisions, blockers, learnings, nextSteps }) {
  try {
    const result = await memoryService.saveContextSnapshot({
      sessionId: sessionId || null,
      summary: summary || '',
      workDone: workDone || {},
      pendingTasks: pendingTasks || [],
      keyDecisions: keyDecisions || [],
      blockers: blockers || [],
      learnings: learnings || [],
      nextSteps: nextSteps || []
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: restore_context
 * Recupera contesto compresso
 */
async function restoreContext({ snapshotId }) {
  try {
    const result = await memoryService.restoreContext(snapshotId);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: generate_session_summary
 * Genera riassunto sessione
 */
async function generateSessionSummary({ sessionId }) {
  try {
    const result = await memoryService.generateSessionSummary(sessionId);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: get_memory_report
 * Genera report memoria
 */
async function getMemoryReport({ format, sessions, keywords, includeStats, includeRecentWork, includeTopSkills }) {
  try {
    const result = await memoryService.getMemoryReport({
      format: format || 'json',
      sessions: sessions || [],
      keywords: keywords || [],
      includeStats: includeStats !== false,
      includeRecentWork: includeRecentWork !== false,
      includeTopSkills: includeTopSkills !== false
    });

    // Se il formato è HTML, restituisci come text
    if (format === 'html' && typeof result === 'string') {
      return { content: [{ type: 'text', text: result }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * Tool: suggest_nodes
 * Suggerisce nodi rilevanti
 */
async function suggestNodes({ currentKeywords, maxResults }) {
  try {
    const result = await memoryService.suggestNodes({
      currentKeywords: currentKeywords || [],
      maxResults: maxResults || 5
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
}

/**
 * TOOL HANDLERS MAP
 * Mappa tutti i tool handlers per il server MCP
 */
export const toolHandlers = {
  // === SESSION MANAGEMENT ===
  start_session: startSession,
  resume_session: resumeSession,
  end_session: endSession,
  list_sessions: listSessions,

  // === NODE MANAGEMENT ===
  add_node: addNode,
  search_nodes: searchNodes,
  get_node_context: getNodeContext,
  link_nodes: linkNodes,
  update_node: updateNode,
  delete_node: deleteNode,

  // === SKILLS FRAMEWORK ===
  register_skill: registerSkill,
  apply_skill: applySkill,
  suggest_skills: suggestSkills,

  // === CONTEXT MANAGEMENT ===
  save_context_snapshot: saveContextSnapshot,
  restore_context: restoreContext,
  generate_session_summary: generateSessionSummary,

  // === REPORTS ===
  get_memory_report: getMemoryReport,
  suggest_nodes: suggestNodes
};

/**
 * TOOL DEFININITIONS
 * Definizioni JSON schema per ogni tool (per capability协商)
 */
export const toolDefinitions = [
  // === SESSION MANAGEMENT ===
  {
    name: 'start_session',
    description: 'Inizia una nuova sessione di lavoro. Ogni sessione traccia il lavoro done, skills apprese, e statistiche.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome sessione (es. "refactoring API Gateway")' },
        description: { type: 'string', description: 'Descrizione dettagliata del lavoro pianificato' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tag per categorizzare' },
        projectPath: { type: 'string', description: 'Percorso progetto (facoltativo)' },
        initialContext: { type: 'object', description: 'Contesto iniziale snapshot' }
      },
      required: ['name']
    }
  },
  {
    name: 'resume_session',
    description: 'Riprende una sessione esistente',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'ID della sessione da riprendere' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'end_session',
    description: 'Chiude la sessione attuale e genera statistiche finali',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'ID della sessione da chiudere' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'list_sessions',
    description: 'Lista sessioni con filtri opzionali',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 20 },
        includeEnded: { type: 'boolean', default: false },
        tags: { type: 'array', items: { type: 'string' } },
        projectPath: { type: 'string' }
      }
    }
  },

  // === NODE MANAGEMENT ===
  {
    name: 'add_node',
    description: 'Aggiunge un nodo alla memoria neurale',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Sessione di appartenenza (opzionale)' },
        keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords per ricerca' },
        content: { type: 'string', description: 'Contenuto long-text' },
        type: { type: 'string', enum: ['task', 'entity', 'file', 'concept', 'summary', 'action', 'generic', 'skill', 'error', 'edge_case', 'operation', 'convention', 'pattern', 'context_snapshot'], default: 'generic' },
        parentId: { type: 'string', description: 'ID nodo padre per gerarchia' },
        metadata: { type: 'object', description: 'Dati aggiuntivi' },
        weight: { type: 'number', default: 1.0 }
      },
      required: ['keywords']
    }
  },
  {
    name: 'search_nodes',
    description: 'Cerca nodi per keywords con confidence scoring',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' } },
        maxResults: { type: 'number', default: 10 },
        minConfidence: { type: 'number', default: 0.1 },
        type: { type: 'string' },
        sessionId: { type: 'string' }
      },
      required: ['keywords']
    }
  },
  {
    name: 'get_node_context',
    description: 'Ottiene contesto completo di un nodo (breadcrumbs, figli, relazioni)',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        depth: { type: 'number', default: 1 }
      },
      required: ['nodeId']
    }
  },
  {
    name: 'link_nodes',
    description: 'Crea un collegamento tra due nodi',
    inputSchema: {
      type: 'object',
      properties: {
        fromNodeId: { type: 'string' },
        toNodeId: { type: 'string' },
        linkType: { type: 'string', enum: ['child', 'parent', 'related', 'reference', 'trigger', 'caused'], default: 'related' },
        weight: { type: 'number', default: 1.0 }
      },
      required: ['fromNodeId', 'toNodeId']
    }
  },
  {
    name: 'update_node',
    description: 'Aggiorna un nodo esistente',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        content: { type: 'string' },
        metadata: { type: 'object' },
        weight: { type: 'number' }
      },
      required: ['nodeId']
    }
  },
  {
    name: 'delete_node',
    description: 'Elimina un nodo',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        cascade: { type: 'boolean', default: false, description: 'Elimina anche i figli' }
      },
      required: ['nodeId']
    }
  },

  // === SKILLS FRAMEWORK ===
  {
    name: 'register_skill',
    description: 'Registra una SKILL con schema rigido obbligatorio. Schema: name (obbligatorio), framework, language, filePattern, learnSteps[], useCases[].',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome della skill (obbligatorio)' },
        framework: { type: 'string', description: 'Framework (es. fastify, react, prisma)' },
        language: { type: 'string', description: 'Linguaggio (es. javascript, typescript)' },
        filePattern: { type: 'string', description: 'Pattern file (es. *.service.js)' },
        learnSteps: { type: 'array', items: { type: 'string' }, description: 'Passi per imparare' },
        useCases: { type: 'array', items: { type: 'string' }, description: 'Casi d\'uso' },
        implementation: { type: 'string', description: 'Implementazione dettagliata' },
        examples: { type: 'array', items: { type: 'string' } },
        prerequisites: { type: 'array', items: { type: 'string' } },
        keywords: { type: 'array', items: { type: 'string' } },
        content: { type: 'string' }
      },
      required: ['name']
    }
  },
  {
    name: 'apply_skill',
    description: 'Trova e applica skill basata su keywords e contesto',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' } },
        context: { type: 'string' },
        domain: { type: 'string', description: 'Filtra per linguaggio/framework' }
      },
      required: ['keywords']
    }
  },
  {
    name: 'suggest_skills',
    description: 'Suggerisce skills rilevanti basate sul contesto corrente',
    inputSchema: {
      type: 'object',
      properties: {
        currentKeywords: { type: 'array', items: { type: 'string' } },
        maxResults: { type: 'number', default: 5 },
        domain: { type: 'string' }
      },
      required: ['currentKeywords']
    }
  },

  // === CONTEXT MANAGEMENT ===
  {
    name: 'save_context_snapshot',
    description: 'Salva snapshot dettagliato del contesto di lavoro',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        summary: { type: 'string' },
        workDone: { type: 'object' },
        pendingTasks: { type: 'array', items: { type: 'string' } },
        keyDecisions: { type: 'array', items: { type: 'string' } },
        blockers: { type: 'array', items: { type: 'string' } },
        learnings: { type: 'array', items: { type: 'string' } },
        nextSteps: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    name: 'restore_context',
    description: 'Recupera un contesto salvato',
    inputSchema: {
      type: 'object',
      properties: {
        snapshotId: { type: 'string' }
      },
      required: ['snapshotId']
    }
  },
  {
    name: 'generate_session_summary',
    description: 'Genera riassunto dettagliato di una sessione',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' }
      },
      required: ['sessionId']
    }
  },

  // === REPORTS ===
  {
    name: 'get_memory_report',
    description: 'Genera report della memoria in formato JSON o HTML',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'html'], default: 'json' },
        sessions: { type: 'array', items: { type: 'string' } },
        keywords: { type: 'array', items: { type: 'string' } },
        includeStats: { type: 'boolean', default: true },
        includeRecentWork: { type: 'boolean', default: true },
        includeTopSkills: { type: 'boolean', default: true }
      }
    }
  },
  {
    name: 'suggest_nodes',
    description: 'Suggerisce nodi rilevanti basati su keywords correnti',
    inputSchema: {
      type: 'object',
      properties: {
        currentKeywords: { type: 'array', items: { type: 'string' } },
        maxResults: { type: 'number', default: 5 }
      },
      required: ['currentKeywords']
    }
  }
];

/**
 * Registra tutti i tool su un server McpServer
 * @param {McpServer} server - Istanza del server MCP
 * @returns {Array} Lista dei tool registrati
 */
export function registerAllTools(server) {
  const registeredTools = [];

  for (const tool of toolDefinitions) {
    const zodShape = convertJsonSchemaToZodShape(tool.inputSchema);

    server.tool(tool.name, tool.description, zodShape, async (args) => {
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
      inputSchema: tool.inputSchema,
    });
  }

  return registeredTools;
}

/**
 * Helper: converte un JSON schema molto semplice in una shape Zod (oggetto di schemi)
 */
function convertJsonSchemaToZodShape(schema) {
  if (!schema || !schema.properties) {
    return {};
  }

  const shape = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    let zType;
    switch (prop.type) {
      case 'string':
        zType = z.string();
        if (prop.enum) zType = z.enum(prop.enum);
        break;
      case 'number':
        zType = z.number();
        break;
      case 'boolean':
        zType = z.boolean();
        break;
      case 'array':
        zType = z.array(prop.items?.type === 'string' ? z.string() : z.any());
        break;
      case 'object':
        zType = z.record(z.any());
        break;
      default:
        zType = z.any();
    }

    if (prop.description) {
      zType = zType.describe(prop.description);
    }

    if (schema.required && schema.required.includes(key)) {
      shape[key] = zType;
    } else {
      shape[key] = zType.optional();
    }
  }

  return shape;
}
