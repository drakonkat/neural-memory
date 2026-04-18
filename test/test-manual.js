/**
 * Test Manuale per Neural Memory MCP
 * Esegue una sequenza di test sui tool MCP
 */

const { spawn } = require('child_process');

// Colori console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Esegue un test chiamando il server MCP via STDIO
async function testTool(toolName, args) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['src/index.js'], {
      cwd: __dirname + '/..'
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    server.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });

    // Invia richiesta JSON-RPC
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    setTimeout(() => {
      server.stdin.write(JSON.stringify(request) + '\n');
      server.stdin.end();
    }, 100);

    // Timeout
    setTimeout(() => {
      server.kill();
      reject(new Error('Timeout'));
    }, 5000);
  });
}

// Alternativa: Test diretto del servizio
async function testDirect() {
  log('\n🧪 Neural Memory MCP - Test Manuale\n', 'cyan');
  log('═'.repeat(50), 'blue');

  try {
    // Test 1: Inizializza progetto
    log('\n📦 Test 1: initialize_project', 'yellow');
    const memoryService = require('../src/services/memory');
    
    const project = await memoryService.initializeProject(
      'test-project',
      '/path/to/test-project',
      'Progetto di test'
    );
    log(`✓ Progetto creato: ${project.project_id}`, 'green');
    
    // Test 2: Aggiungi nodi
    log('\n📝 Test 2: add_node', 'yellow');
    
    const node1 = await memoryService.addNode({
      projectId: project.project_id,
      keywords: ['entity', 'User', 'database'],
      content: 'Ho creato l\'entità User con campi: id, name, email',
      type: 'entity',
      weight: 1.5
    });
    log(`✓ Nodo 1 creato: ${node1.node_id}`, 'green');

    const node2 = await memoryService.addNode({
      projectId: project.project_id,
      keywords: ['task', 'API', 'CRUD'],
      content: 'Implementato CRUD completo per l\'entità User tramite Express router',
      type: 'task',
      parentId: node1.node_id,
      weight: 1.2
    });
    log(`✓ Nodo 2 creato: ${node2.node_id}`, 'green');

    const node3 = await memoryService.addNode({
      projectId: project.project_id,
      keywords: ['file', 'routes', 'users.js'],
      content: 'Creato routes/users.js con endpoints GET, POST, PUT, DELETE',
      type: 'file',
      parentId: node2.node_id,
      metadata: { path: 'routes/users.js' }
    });
    log(`✓ Nodo 3 creato: ${node3.node_id}`, 'green');

    // Test 3: Cerca nodi
    log('\n🔍 Test 3: search_nodes', 'yellow');
    const searchResults = await memoryService.searchNodes({
      projectId: project.project_id,
      keywords: ['User', 'entity'],
      maxResults: 10
    });
    log(`✓ Trovati ${searchResults.length} risultati:`, 'green');
    searchResults.forEach((r, i) => {
      log(`  ${i + 1}. [${r.type}] confidence: ${r.confidence}`, 'reset');
      log(`     keywords: ${r.keywords.join(', ')}`, 'reset');
    });

    // Test 4: Cerca con altre keywords
    log('\n🔍 Test 4: search_nodes (API/CRUD)', 'yellow');
    const searchResults2 = await memoryService.searchNodes({
      projectId: project.project_id,
      keywords: ['API', 'CRUD'],
      maxResults: 5
    });
    log(`✓ Trovati ${searchResults2.length} risultati`, 'green');

    // Test 5: Contesto nodo
    log('\n🌳 Test 5: get_node_context', 'yellow');
    const context = await memoryService.getNodeContext({
      projectId: project.project_id,
      nodeId: node1.node_id,
      depth: 2
    });
    log(`✓ Contesto nodo: ${context.children.length} figli`, 'green');
    log(`  breadcrumbs: ${context.breadcrumbs.length} livelli`, 'reset');

    // Test 6: Link nodi
    log('\n🔗 Test 6: link_nodes', 'yellow');
    const link = await memoryService.linkNodes({
      projectId: project.project_id,
      fromNodeId: node1.node_id,
      toNodeId: node2.node_id,
      linkType: 'caused',
      weight: 1.0
    });
    log(`✓ Link creato: ${link.link_id}`, 'green');

    // Test 7: Suggerimenti
    log('\n💡 Test 7: suggest_nodes', 'yellow');
    const suggestions = await memoryService.suggestNodes({
      projectId: project.project_id,
      currentKeywords: ['database', 'model'],
      maxResults: 3
    });
    log(`✓ Suggeriti ${suggestions.length} nodi`, 'green');

    // Test 8: Statistiche
    log('\n📊 Test 8: get_project_stats', 'yellow');
    const stats = await memoryService.getProjectStats(project.project_id);
    log(`✓ Statistiche progetto:`, 'green');
    log(`  - Totale nodi: ${stats.total_nodes}`, 'reset');
    log(`  - Tipi: ${JSON.stringify(stats.types)}`, 'reset');

    // Test 9: Update nodo
    log('\n✏️ Test 9: update_node', 'yellow');
    const update = await memoryService.updateNode({
      projectId: project.project_id,
      nodeId: node1.node_id,
      keywords: ['entity', 'User', 'database', 'model', 'schema'],
      weight: 2.0
    });
    log(`✓ Nodo aggiornato: ${update.node_id}`, 'green');

    // Test 10: Cerca dopo update
    log('\n🔍 Test 10: search_nodes (dopo update)', 'yellow');
    const searchResults3 = await memoryService.searchNodes({
      projectId: project.project_id,
      keywords: ['model', 'schema'],
      maxResults: 5
    });
    log(`✓ Trovati ${searchResults3.length} risultati`, 'green');
    if (searchResults3.length > 0) {
      log(`  Miglior risultato: ${searchResults3[0].node_id} (confidence: ${searchResults3[0].confidence})`, 'reset');
    }

    log('\n' + '═'.repeat(50), 'blue');
    log('✅ Tutti i test completati con successo!', 'green');
    log('═'.repeat(50), 'blue');

  } catch (error) {
    log(`\n❌ Errore: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Esegui test
testDirect().then(() => {
  process.exit(0);
}).catch((error) => {
  log(`\n❌ Test falliti: ${error.message}`, 'red');
  process.exit(1);
});
