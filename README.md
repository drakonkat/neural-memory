# 🧠 Neural Memory v2.0

> ⚠️ **IMPORTANT NOTICE**: This is an **experimental MCP (Model Context Protocol)** tool. While it has shown promising results when used locally, it is still under active development and may evolve over time. **Feedback and contributions are highly appreciated!** Please report any issues, suggestions, or feature requests on our [GitHub Issues](https://github.com/drakonkat/neural-memory/issues) page. Your input helps make this tool better for everyone! nya~

---

**Model Context Protocol (MCP) system for knowledge memorization and contextual retrieval.**

---

## 🚀 Try Neural Memory NOW!

Want to try it right away in your Cline? Add this configuration to your `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "neural-memory": {
      "timeout": 120,
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@drakonkat/neural-memory@latest"
      ]
    }
  }
}
```

### For Local Development

```json
{
  "mcpServers": {
    "neural-memory": {
      "timeout": 120,
      "type": "stdio",
      "command": "node",
      "args": [
        "./neural-memory/src/index.js"
      ]
    }
  }
}
```

> ⚠️ **Note:** Replace the path with your local project path!

---

## What's New in v2.0

### 🎯 Unified Database
- **No more separate databases per project!** All memory resides in a single SQLite database
- Faster, simpler, zero configuration

### 📋 Session Management
- **Start/resume/end** work sessions
- Automatic tracking: nodes created, skills learned, duration
- Detailed context snapshot

### 🎓 Skills Framework
- **Rigid schema** for registering skills with consistent structure
- `framework`, `language`, `filePattern`, `learnSteps`, `useCases`
- Automatic context-based suggestions

### 📊 HTML Reports
- Generate visual reports of your memory
- Statistics, most used skills, recent work

## Quick Start

```javascript
import { initialize, handleMcpRequest } from 'neural-memory';

// Initialize the service
await initialize();

// Start a session
const session = await handleMcpRequest('start_session', {
  name: 'Refactoring API Gateway',
  tags: ['backend', 'api']
});

// Register a skill
await handleMcpRequest('register_skill', {
  name: 'Fastify CRUD API',
  framework: 'fastify',
  language: 'javascript',
  filePattern: '**/*.service.js',
  learnSteps: [
    '1. Initialize project',
    '2. Create validation schema',
    '3. Implement handler'
  ],
  useCases: [
    'Create REST API',
    'Handle standardized errors'
  ]
});

// Search for skills
const skills = await handleMcpRequest('suggest_skills', {
  currentKeywords: ['fastify', 'api'],
  domain: 'javascript'
});

// Save context
await handleMcpRequest('save_context_snapshot', {
  summary: 'Refactoring 80% complete',
  pendingTasks: ['Integration testing', 'Deploy to staging'],
  learnings: ['Prisma requires explicit migrations']
});

// End session
await handleMcpRequest('end_session', {
  sessionId: session.session_id
});
```

## Available Tools

### Session Management
| Tool | Description |
|------|-------------|
| `start_session` | Start new session |
| `resume_session` | Resume existing session |
| `end_session` | End session |
| `list_sessions` | List sessions with filters |

### Skills Framework
| Tool | Description |
|------|-------------|
| `register_skill` | Register skill (rigid schema) |
| `apply_skill` | Find and apply skill |
| `suggest_skills` | Suggest skills |

### Context Management
| Tool | Description |
|------|-------------|
| `save_context_snapshot` | Save snapshot |
| `restore_context` | Restore context |
| `generate_session_summary` | Session summary |

### Node Management
| Tool | Description |
|------|-------------|
| `add_node` | Add node |
| `search_nodes` | Search nodes (with confidence) |
| `get_node_context` | Node context |
| `link_nodes` | Link nodes |
| `update_node` | Update node |
| `delete_node` | Delete node |

### Reports
| Tool | Description |
|------|-------------|
| `get_memory_report` | JSON/HTML report |
| `suggest_nodes` | Suggest nodes |

## Node Types

| Type | Priority | Use Case |
|------|----------|----------|
| `skill` | ⭐⭐⭐ | Knowledge skill |
| `error` | ⭐⭐⭐ | Resolved error |
| `operation` | ⭐⭐ | How-to |
| `convention` | ⭐⭐ | Naming rules |
| `edge_case` | ⭐⭐ | Edge case |
| `pattern` | ⭐ | Design pattern |
| `task` | ⭐ | Completed task |
| `generic` | ⭐ | Generic node |

## Confidence Scoring

The system calculates a **confidence score (0.0-1.0)** for each result based on:

- **BM25 Score** (35%) - Full-text search ranking
- **Keyword Match** (25%) - Keywords overlap
- **Recency Bonus** (10%) - Recent nodes preferred
- **Type Score** (15%) - Skills/errors are more important
- **Weight** (15%) - Manual weight

## Rigid Skill Schema

```json
{
  "name": "Skill Name",
  "framework": "fastify|react|prisma|...",
  "language": "javascript|typescript|python|...",
  "filePattern": "**/*.service.js",
  "learnSteps": ["Step 1", "Step 2"],
  "useCases": ["Case 1", "Case 2"],
  "implementation": "// Code...",
  "examples": ["file1.js"],
  "prerequisites": ["Prerequisite 1"]
}
```

## Installation

```bash
npm install neural-memory
```

## Database

The unified database is located at:
```
data/neural-memory-unified.sqlite
```

## License

MIT