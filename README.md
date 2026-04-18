# 🧠 Neural Memory MCP

Server MCP per dare memoria persistente e organizzata agli agenti AI.

[![npm version](https://badge.fury.io/js/neural-memory.svg)](https://badge.fury.io/js/neural-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Concetto

Questo server MCP implementa un sistema di memoria neurale per agenti AI:
- **Locale**: Nessun cloud, tutto su SQLite
- **Gerarchico**: Nodi organizzati ad albero
- **Keyword-based**: Ricerca con ranking per probabilità
- **Un progetto = Un DB**: Memoria isolata per ogni progetto

## 📦 Installazione

### Da npm (dopo pubblicazione):
```bash
npm install neural-memory
```

### Da GitHub (in sviluppo):
```bash
git clone https://github.com/Drakonkat/neural-memory.git
cd neural-memory
npm install
```

### Dipendenze:
- Node.js >= 18
- npm

## 🚀 Utilizzo

### Avvio Server MCP

```bash
# Avvio standard (stdio)
npm start

# Con inspector per debug
npm run inspect
```

### Test Manuale

```bash
npm test
```

## 🔧 Tool Disponibili

### MVP (Step 1)
| Tool | Descrizione |
|------|-------------|
| `initialize_project` | Crea un nuovo progetto di memoria |
| `add_node` | Aggiunge un nodo con keywords |
| `search_nodes` | Cerca nodi per keywords con ranking |

### Navigazione (Step 2)
| Tool | Descrizione |
|------|-------------|
| `get_node_context` | Ottieni contesto gerarchico di un nodo |
| `get_project_stats` | Statistiche del progetto |

### Linking (Step 3)
| Tool | Descrizione |
|------|-------------|
| `link_nodes` | Crea collegamenti tra nodi |
| `suggest_nodes` | Suggerisce nodi rilevanti |

### Management (Step 4)
| Tool | Descrizione |
|------|-------------|
| `update_node` | Aggiorna un nodo |
| `delete_node` | Elimina un nodo (con cascade) |

## 📁 Struttura

```
neural-memory/
├── src/
│   ├── index.js           # Entry point MCP server
│   ├── database/
│   │   ├── connection.js  # Gestione connessioni SQLite
│   │   ├── init-master.js # Database master progetti
│   │   └── models/        # Modelli Sequelize
│   ├── services/
│   │   └── memory.js      # Logica di business
│   └── tools/
│       └── index.js       # Definizione tool MCP
├── data/                  # File SQLite (generati)
│   ├── master.sqlite     # Database master
│   └── {project_id}.sqlite
├── test/
│   └── test-manual.js    # Test manuali
└── package.json
```

## 🔍 Esempio d'Uso

```javascript
// 1. Inizializza progetto
const project = await callTool('initialize_project', {
  name: 'my-app',
  path: '/path/to/my-app',
  description: 'Applicazione di esempio'
});

// 2. Aggiungi nodi memoria
await callTool('add_node', {
  project_id: project.project_id,
  keywords: ['entity', 'User', 'database'],
  content: 'Ho creato l\'entità User con campi: id, name, email, createdAt',
  type: 'entity',
  weight: 1.5
});

// 3. Cerca nodi correlati
const results = await callTool('search_nodes', {
  project_id: project.project_id,
  keywords: ['User', 'entity'],
  max_results: 5,
  min_confidence: 0.2
});
```

## 🧮 Sistema di Ranking

Il confidence score (0.0 - 1.0) è calcolato con:

```
confidence = BM25(0.4) + keyword_match(0.3) + recency(0.15) + type(0.1) + weight(0.05)
```

- **BM25**: Full-text search score (SQLite FTS5)
- **keyword_match**: % di keywords che matchano
- **recency**: Bonus per nodi recenti (< 7 giorni)
- **type**: Bonus per tipo 'task'
- **weight**: Peso manuale impostato

## 🔧 Configurazione MCP con Node.js

### Opzione 1: Installazione Globale npm (Consigliato)

1. **Pubblica il pacchetto su npm** (o installa da GitHub):
```bash
npm publish
```

2. **Installa globalmente**:
```bash
npm install -g @drakonkat/neural-memory
```

3. **Configura nel tuo editor**:

**Cline** (`~/.cline/settings/cline_mcp_settings.json`):
```json
"neural-memory": {
  "timeout": 120,
  "type": "stdio",
  "command": "node",
  "args": [
    "C:\\Users\\mauro\\AppData\\Roaming\\npm\\node_modules\\neural-memory\\src\\index.js"
  ],
  "autoApprove": []
}
```

**VS Code / Cursor** (`settings.json`):
```json
{
  "mcpServers": {
    "neural-memory": {
      "command": "node",
      "args": ["C:\\Users\\mauro\\AppData\\Roaming\\npm\\node_modules\\neural-memory\\src\\index.js"]
    }
  }
}
```

### Opzione 2: Installazione Locale (Sviluppo)

1. **Clona il repository**:
```bash
git clone https://github.com/Drakonkat/neural-memory.git
cd neural-memory
npm install
```

2. **Configura nel tuo editor**:

**Cline**:
```json
"neural-memory": {
  "timeout": 120,
  "type": "stdio",
  "command": "node",
  "args": [
    "C:\\path\\to\\neural-memory\\src\\index.js"
  ],
  "autoApprove": []
}
```

**VS Code / Cursor**:
```json
{
  "mcpServers": {
    "neural-memory": {
      "command": "node",
      "args": ["C:\\path\\to\\neural-memory\\src\\index.js"]
    }
  }
}
```

### Opzione 3: Usa npx (Senza installazione)

```json
"neural-memory": {
  "timeout": 120,
  "type": "stdio",
  "command": "npx",
  "args": [
    "@drakonkat/neural-memory"
  ],
  "autoApprove": []
}
```

---

## 📋 Requisiti di Sistema

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (incluso con Node.js)

### Dipendenze npm (installate automaticamente)

Le dipendenze vengono installate automaticamente con `npm install`:
- `@modelcontextprotocol/sdk` - SDK MCP
- `sequelize` - ORM per SQLite
- `sqlite3` - Driver SQLite
- `uuid` - Generazione UUID

### Build nativo sqlite3 (se necessario)

Se ricevi errori relativi a `sqlite3`, potrebbe essere necessario ricompilare il modulo nativo:

```bash
npm rebuild sqlite3
```

Su Windows potresti aver bisogno di:
```bash
npm install --global-windows-build-tools
npm rebuild sqlite3
```

## 🤖 Integrazione LLM

Per dare memoria all'agente AI, chiama `add_node` dopo ogni task:

```javascript
// Dopo aver completato un task
await callTool('add_node', {
  project_id: currentProjectId,
  keywords: extractKeywords(taskDescription),
  content: formatTaskSummary(task),
  type: 'task',
  parent_id: currentContextNodeId
});
```

## 🚀 Pubblicazione su npm

1. **Crea account** su https://www.npmjs.com

2. **Login**:
   ```bash
   npm login
   ```

3. **Pubblica**:
   ```bash
   npm publish
   ```

4. **Versione**: Aggiorna `version` in `package.json` prima di ogni publish

## 📂 Pubblicazione su GitHub

1. **Crea repo** su https://github.com/new
   - Nome: `neural-memory`
   - Privato o pubblico a scelta

2. **Inizializza git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/Drakonkat/neural-memory.git
   git push -u origin main
   ```

3. **Dopo modifiche**:
   ```bash
   git add .
   git commit -m "Your message"
   git push
   ```

## 👤 Autore

**Drakonkat**

## 📝 Licenza

MIT
