# 🧠 Neural Memory MCP - Specifica Tecnica

## 1. Panoramica

**Nome**: Neural Memory MCP  
**Tipo**: Model Context Protocol Server  
**Scopo**: Dare memoria persistente e organizzata agli agenti AI tramite un sistema neurale-like  
**Stack**: Node.js (JavaScript), SQLite + FTS5, Sequelize ORM

---

## 2. Architettura

### 2.1 Schema Concettuale

```
┌─────────────────────────────────────────────────────────────┐
│                      MASTER DB                               │
│  ┌─────────────┐                                           │
│  │  projects   │ ────── project_id ──────┐                 │
│  └─────────────┘                         │                 │
└───────────────────────────────────────────│─────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT DB (1 per progetto)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   nodes     │  │ node_links  │  │    nodes_fts (FTS5) │  │
│  │             │  │             │  │                     │  │
│  │ id          │  │ from_node   │  │ node_id             │  │
│  │ keywords[]  │◄─┤ to_node     │  │ keywords            │  │
│  │ content     │  │ link_type   │  │ content             │  │
│  │ type        │  │ weight      │  │                     │  │
│  │ depth       │  └─────────────┘  └─────────────────────┘  │
│  │ parent_id ──┼──► (self-reference)                        │
│  └─────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Struttura File

```
neural-memory/
├── src/
│   ├── index.js              # Entry point MCP server
│   ├── database/
│   │   ├── connection.js    # Sequelize connection manager
│   │   ├── init-master.js   # Master database setup
│   │   └── models/
│   │       ├── Project.js   # Project model
│   │       ├── Node.js      # Node model
│   │       ├── Link.js      # Link model
│   │       └── index.js     # Model associations
│   ├── services/
│   │   └── memory.js        # Business logic
│   └── tools/
│       └── index.js         # MCP tool definitions
├── data/
│   ├── master.sqlite       # Master database
│   └── {project_id}.sqlite # Project databases
├── test/
│   └── test-manual.js      # Manual tests
├── package.json
├── README.md
└── SPEC.md                 # This file
```

---

## 3. Modelli Dati

### 3.1 Project Model

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | STRING | Nome del progetto |
| `path` | STRING | Percorso (unico) |
| `description` | TEXT | Descrizione |
| `metadata` | JSON | Metadati custom |
| `stats` | JSON | Cache statistiche |
| `created_at` | DATETIME | Timestamp creazione |
| `updated_at` | DATETIME | Timestamp aggiornamento |

### 3.2 Node Model

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `projectId` | UUID | FK a Project |
| `parentId` | UUID | FK a Node (nullable) |
| `type` | STRING | Tipo: task, entity, file, concept, summary, action, generic |
| `keywords` | JSON | Array keywords |
| `content` | TEXT | Contenuto long-text |
| `metadata` | JSON | Dati aggiuntivi |
| `depth` | INTEGER | Livello gerarchia (0 = radice) |
| `weight` | FLOAT | Peso per ranking (0.1-10.0) |
| `keywordCount` | INTEGER | Cache conteggio keywords |
| `created_at` | DATETIME | Timestamp creazione |
| `updated_at` | DATETIME | Timestamp aggiornamento |

### 3.3 Link Model

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `fromNodeId` | UUID | Nodo sorgente |
| `toNodeId` | UUID | Nodo destinazione |
| `linkType` | STRING | Tipo: child, parent, related, reference, trigger, caused |
| `weight` | FLOAT | Peso collegamento |
| `metadata` | JSON | Dati aggiuntivi |
| `created_at` | DATETIME | Timestamp creazione |
| `updated_at` | DATETIME | Timestamp aggiornamento |

---

## 4. MCP Tools

### 4.1 Step 1 - MVP Base

#### `initialize_project`
```javascript
{
  name: string,           // Required: Nome progetto
  path: string,            // Required: Percorso progetto
  description?: string     // Optional: Descrizione
}
// Returns: { project_id, name, root_node_id, success }
```

#### `add_node`
```javascript
{
  project_id: string,      // Required
  keywords?: string[],     // Default: []
  content?: string,        // Default: ''
  type?: string,           // Default: 'generic'
  parent_id?: string,       // Default: null
  weight?: number,         // Default: 1.0
  metadata?: object        // Default: {}
}
// Returns: { node_id, type, depth, keywords_count, success }
```

#### `search_nodes`
```javascript
{
  project_id: string,      // Required
  keywords: string[],      // Required
  max_results?: number,     // Default: 10
  min_confidence?: number, // Default: 0.1
  type?: string           // Filter by type
}
// Returns: [{ node_id, type, keywords, content, depth, confidence, created_at }]
```

### 4.2 Step 2 - Navigazione

#### `get_node_context`
```javascript
{
  project_id: string,      // Required
  node_id: string,         // Required
  depth?: number           // Default: 1
}
// Returns: { node, breadcrumbs[], children[], grandchildren[], related[] }
```

#### `get_project_stats`
```javascript
{
  project_id: string       // Required
}
// Returns: { project_id, project_name, total_nodes, total_links, types, last_activity }
```

### 4.3 Step 3 - Linking

#### `link_nodes`
```javascript
{
  project_id: string,      // Required
  from_node_id: string,    // Required
  to_node_id: string,      // Required
  link_type?: string,      // Default: 'related'
  weight?: number          // Default: 1.0
}
// Returns: { link_id, link_type, weight, created }
```

#### `suggest_nodes`
```javascript
{
  project_id: string,      // Required
  current_keywords?: string[], // Default: []
  max_results?: number     // Default: 5
}
// Returns: [{ node_id, type, keywords, reason, confidence }]
```

### 4.4 Step 4 - Management

#### `update_node`
```javascript
{
  node_id: string,         // Required
  keywords?: string[],
  content?: string,
  weight?: number,
  metadata?: object
}
// Returns: { node_id, updated }
```

#### `delete_node`
```javascript
{
  project_id: string,      // Required
  node_id: string,         // Required
  cascade?: boolean        // Default: false
}
// Returns: { deleted, node_id }
```

---

## 5. Sistema di Ranking

### 5.1 Algoritmo Confidence

```
confidence = BM25_norm + keyword_match + recency + type_bonus + weight

Dove:
- BM25_norm     = min(0.4, -bm25_score / 10)  [FTS5 full-text]
- keyword_match = (matched / total_keywords) * 0.3
- recency       = 0.15 (< 1gg), 0.10 (< 7gg), 0.05 (< 30gg), 0 (> 30gg)
- type_bonus    = 0.1 (task), 0.05 (other)
- weight        = min(0.05, weight * 0.01)

Totale normalizzato: min(1.0, somma)
```

### 5.2 Esempio Calcolo

Nodo con:
- BM25 score: -2.5 → normalizzato: 0.25
- Keywords: ["entity", "User"] che matchano con ["User"] → 1/1 * 0.3 = 0.30
- Creato 3 giorni fa → 0.10
- Tipo "entity" → 0.05
- Weight 1.5 → 0.015

**Confidence = 0.25 + 0.30 + 0.10 + 0.05 + 0.015 = 0.715**

---

## 6. FTS5 Integration

### 6.1 Creazione Virtual Table

```sql
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  node_id UNINDEXED,
  keywords,
  content,
  content_rowid='rowid'
)
```

### 6.2 Query di Ricerca

```sql
SELECT node_id, bm25(nodes_fts) as score
FROM nodes_fts
WHERE nodes_fts MATCH 'keyword1 OR keyword2 OR ...'
ORDER BY bm25(nodes_fts)
LIMIT ?
```

---

## 7. Iterazioni Sviluppo

### Step 1: ✅ Base MVP
- [x] Setup progetto
- [x] Database connection
- [x] Modelli Sequelize
- [x] MCP server base
- [x] 3 tools MVP (initialize, add_node, search_nodes)

### Step 2: ✅ Navigazione
- [x] get_node_context
- [x] get_project_stats
- [x] Breadcrumbs

### Step 3: ✅ Linking
- [x] link_nodes
- [x] suggest_nodes
- [x] auto_suggest basato su keywords

### Step 4: ✅ Management
- [x] update_node
- [x] delete_node
- [x] Cascade delete

### Step 5: ⬜ Testing & Optimization
- [ ] Test MCP Inspector
- [ ] Test E2E completi
- [ ] Ottimizzazione indici
- [ ] CLI per LLM integration

---

## 8. Testing

### 8.1 MCP Inspector

```bash
npx @modelcontextprotocol/inspector node src/index.js
```

### 8.2 Test Manuale

```bash
npm test
```

---

## 9. Esempi d'Uso

### 9.1 LLM Auto-Save Pattern

```javascript
// Dopo ogni task completato
await callTool('add_node', {
  project_id: currentProjectId,
  keywords: extractTaskKeywords(task),
  content: formatTaskSummary(task),
  type: 'task',
  parent_id: currentContextNodeId,
  metadata: {
    files: task.modifiedFiles,
    actions: task.actions,
    duration: task.duration
  }
});
```

### 9.2 Recupero Memoria

```javascript
// Prima di iniziare un nuovo task
const context = await callTool('get_node_context', {
  project_id: projectId,
  node_id: rootNodeId,
  depth: 2
});

// Cerca task correlati
const related = await callTool('search_nodes', {
  project_id: projectId,
  keywords: currentTaskKeywords,
  max_results: 5,
  min_confidence: 0.3
});
```

---

## 10. Limitazioni & Futuri Miglioramenti

- [ ] Supporto per allegati (blob in DB)
- [ ] Backup automatico
- [ ] Query in linguaggio naturale
- [ ] Auto-linking intelligente (NLP)
- [ ] Clustering automatico
- [ ] Visualizzazione grafo
- [ ] Esportazione/Importazione

---

## 11. Riferimenti

- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Sequelize ORM](https://sequelize.org/)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [BM25 Algorithm](https://en.wikipedia.org/wiki/Okapi_BM25)
