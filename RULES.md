# Neural Memory - AI Usage Guidelines

This document provides rules for AI agents on how to use Neural Memory MCP to preserve project context and history.

## 🎯 Golden Rule

**SAVE EVERYTHING** - After every task, operation, or significant action, save it to memory. Better to save too much than lose important context.

---

## 📋 When to Save to Memory

### Automatic Triggers

Save to memory in these situations:

| Trigger | Action |
|---------|--------|
| Task completed | Save summary with keywords |
| File created/modified | Save file path + purpose |
| Bug fixed | Save problem + solution |
| Decision made | Save rationale + outcome |
| Entity created | Save entity name + fields |
| API endpoint created | Save route + method + purpose |
| Database change | Save table + modifications |
| Configuration set | Save what + why |
| Error encountered | Save error + solution |

### Example Triggers

```
- "I've created a new component"
- "I've fixed the authentication bug"
- "I've added a new API endpoint"
- "I've created the User model"
- "I've configured ESLint"
```

---

## 🏗️ Memory Structure

### Node Types

| Type | Use For | Example Keywords |
|------|---------|------------------|
| `task` | Completed tasks | "login", "auth", "refactor" |
| `entity` | Data models/entities | "User", "Product", "Order" |
| `file` | Created/modified files | "routes/users.js", "utils" |
| `concept` | Architectural decisions | "microservices", "caching" |
| `action` | Single operations | "deploy", "migrate", "test" |
| `summary` | Overall summaries | "project-setup", "phase-1" |

### Hierarchy Levels

```
Level 0 (Root)     → Project summary
Level 1           → Major features/areas
Level 2           → Specific tasks
Level 3+          → Detailed operations
```

---

## 📝 Example Save Patterns

### After Creating Entity

```javascript
// After creating User entity
add_node({
  project_id: "current-project-id",
  type: "entity",
  keywords: ["User", "entity", "model", "auth", "database"],
  content: "Created User entity with fields: id, email, password, createdAt. Used for authentication and user management.",
  parent_id: "root-or-feature-node",
  metadata: {
    files: ["models/User.js"],
    related: ["auth", "login"]
  }
})
```

### After Completing Task

```javascript
// After implementing login feature
add_node({
  project_id: "current-project-id",
  type: "task",
  keywords: ["login", "auth", "JWT", "session", "express"],
  content: "Implemented login feature with JWT tokens. POST /api/auth/login validates credentials and returns token.",
  parent_id: "auth-node-id",
  metadata: {
    files: ["routes/auth.js", "middleware/auth.js"],
    endpoints: ["/api/auth/login", "/api/auth/logout"],
    duration: "2 hours"
  }
})
```

### After Fixing Bug

```javascript
// After fixing CORS error
add_node({
  project_id: "current-project-id",
  type: "task",
  keywords: ["CORS", "bug", "fixed", "middleware", "error"],
  content: "Fixed CORS error by adding cors middleware. Error was: 'Access-Control-Allow-Origin' missing.",
  parent_id: "bugfixes-node",
  metadata: {
    error: "CORS policy blocked requests",
    solution: "Installed and configured cors package",
    files: ["app.js"]
  }
})
```

### After File Creation

```javascript
// After creating new utility
add_node({
  project_id: "current-project-id",
  type: "file",
  keywords: ["utils", "helper", "date", "format"],
  content: "Created utils/dateFormatter.js with functions for date formatting and timezone conversion.",
  parent_id: "utils-node",
  metadata: {
    path: "utils/dateFormatter.js",
    exports: ["formatDate", "formatRelative", "toTimezone"]
  }
})
```

---

## 🔍 How to Search Memory

### Find Related Context

```javascript
// Before starting similar task
search_nodes({
  project_id: "current-project-id",
  keywords: ["login", "auth", "JWT"],
  max_results: 5,
  min_confidence: 0.3
})
```

### Get Task History

```javascript
// Get full context of a feature
get_node_context({
  project_id: "current-project-id",
  node_id: "auth-feature-id",
  depth: 3  // Include children and grandchildren
})
```

### Get Suggestions

```javascript
// Get related nodes based on current context
suggest_nodes({
  project_id: "current-project-id",
  current_keywords: ["database", "migration"],
  max_results: 5
})
```

---

## 🏃 Quick Save Template

When in doubt, save with this template:

```javascript
{
  project_id: "current-project",
  type: "task",  // or entity, file, concept
  keywords: [
    "main-concept-1",
    "main-concept-2",
    "secondary-1",
    "secondary-2"
  ],
  content: "Brief description of what was done and why.",
  parent_id: "relevant-parent-node",
  metadata: {
    files: ["affected-files.js"],
    actions: ["what-changed"]
  }
}
```

---

## 💡 Pro Tips

1. **Be Verbose** - Include details you might need later
2. **Use Keywords** - Think about future search terms
3. **Link Related** - Use `link_nodes` to connect related concepts
4. **Update Often** - Use `update_node` to add more context
5. **Check History** - Always search before starting similar work

---

## 🎓 Memory is Power

The more you save, the smarter the AI becomes about your project. 

**Rule of Thumb**: If you think "I should remember this", save it!

---

*For MCP tool documentation, see SPEC.md*
