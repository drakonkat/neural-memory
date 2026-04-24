# 🧠 Neural Memory v2.0

**Sistema MCP (Model Context Protocol) per memorizzazione e recupero contestuale della conoscenza.**

---

## 🚀 Prova Neural Memory ORA!

Vuoi provarlo subito nel tuo Cline? Aggiungi questa configurazione al tuo `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "neural-memory": {
      "timeout": 120,
      "type": "stdio",
      "command": "npx",
      "args": [
        "@drakonkat/neural-memory"
      ]
    }
  }
}
```

### Per uso locale (sviluppo)

```json
{
  "mcpServers": {
    "neural-memory": {
      "timeout": 120,
      "type": "stdio",
      "command": "node",
      "args": [
        "E:/Project/TND/magic/neural-memory/src/index.js"
      ]
    }
  }
}
```

> ⚠️ **Nota:** Sostituisci il path con quello del tuo progetto locale!

---

## Novità v2.0

### 🎯 Database Unificato
- **No più database separati per progetto!** Tutta la memoria risiede in un unico database SQLite
- Più veloce, più semplice, zero configurazione

### 📋 Session Management
- **Inizia/riprendi/chiudi sessioni** di lavoro
- Tracciamento automatico: nodi creati, skills apprese, durata
- Snapshot contesto dettagliato

### 🎓 Skills Framework
- **Schema rigido** per registrare skills con struttura consistente
- `framework`, `language`, `filePattern`, `learnSteps`, `useCases`
- Suggerimento automatico basato su contesto

### 📊 Reports HTML
- Genera report visivi della tua memoria
- Statistiche, skills più usate, lavoro recente

## Quick Start

```javascript
import { initialize, handleMcpRequest } from 'neural-memory';

// Inizializza il servizio
await initialize();

// Inizia una sessione
const session = await handleMcpRequest('start_session', {
  name: 'Refactoring API Gateway',
  tags: ['backend', 'api']
});

// Registra una skill
await handleMcpRequest('register_skill', {
  name: 'Fastify CRUD API',
  framework: 'fastify',
  language: 'javascript',
  filePattern: '**/*.service.js',
  learnSteps: [
    '1. Inizializzare progetto',
    '2. Creare schema validazione',
    '3. Implementare handler'
  ],
  useCases: [
    'Creare API REST',
    'Gestire errori standardizzati'
  ]
});

// Cerca skills
const skills = await handleMcpRequest('suggest_skills', {
  currentKeywords: ['fastify', 'api'],
  domain: 'javascript'
});

// Salva contesto
await handleMcpRequest('save_context_snapshot', {
  summary: 'Refactoring completato 80%',
  pendingTasks: ['Test integrazione', 'Deploy staging'],
  learnings: ['Prisma richiede migration esplicite']
});

// Chiudi sessione
await handleMcpRequest('end_session', {
  sessionId: session.session_id
});
```

## Tools Disponibili

### Session Management
| Tool | Descrizione |
|------|-------------|
| `start_session` | Inizia nuova sessione |
| `resume_session` | Riprendi sessione esistente |
| `end_session` | Chiudi sessione |
| `list_sessions` | Lista sessioni con filtri |

### Skills Framework
| Tool | Descrizione |
|------|-------------|
| `register_skill` | Registra skill (schema rigido) |
| `apply_skill` | Trova e applica skill |
| `suggest_skills` | Suggerisci skills |

### Context Management
| Tool | Descrizione |
|------|-------------|
| `save_context_snapshot` | Salva snapshot |
| `restore_context` | Recupera contesto |
| `generate_session_summary` | Riassunto sessione |

### Node Management
| Tool | Descrizione |
|------|-------------|
| `add_node` | Aggiungi nodo |
| `search_nodes` | Cerca nodi (con confidence) |
| `get_node_context` | Contesto nodo |
| `link_nodes` | Collega nodi |
| `update_node` | Aggiorna nodo |
| `delete_node` | Elimina nodo |

### Reports
| Tool | Descrizione |
|------|-------------|
| `get_memory_report` | Report JSON/HTML |
| `suggest_nodes` | Suggerisci nodi |

## Node Types

| Type | Priority | Use Case |
|------|----------|----------|
| `skill` | ⭐⭐⭐ | Knowledge skill |
| `error` | ⭐⭐⭐ | Errore risolto |
| `operation` | ⭐⭐ | How-to |
| `convention` | ⭐⭐ | Regole naming |
| `edge_case` | ⭐⭐ | Caso limite |
| `pattern` | ⭐ | Design pattern |
| `task` | ⭐ | Task completato |
| `generic` | ⭐ | Nodo generico |

## Confidence Scoring

Il sistema calcola un **confidence score (0.0-1.0)** per ogni risultato basato su:

- **BM25 Score** (35%) - Full-text search ranking
- **Keyword Match** (25%) - Sovrapposizione keywords
- **Recency Bonus** (10%) - Nodi recenti preferiti
- **Type Score** (15%) - Skills/errors più importanti
- **Weight** (15%) - Peso manuale

## Schema Skill Rigido

```json
{
  "name": "Nome Skill",
  "framework": "fastify|react|prisma|...",
  "language": "javascript|typescript|python|...",
  "filePattern": "**/*.service.js",
  "learnSteps": ["Passo 1", "Passo 2"],
  "useCases": ["Caso 1", "Caso 2"],
  "implementation": "// Codice...",
  "examples": ["file1.js"],
  "prerequisites": ["Prerequisito 1"]
}
```

## Installazione

```bash
npm install neural-memory
```

## Database

Il database unificato si trova in:
```
data/neural-memory-unified.sqlite
```

## License

MIT
