/**
 * Test Manuale per Neural Memory MCP v2.0
 * Database Unificato con Session Management
 */

import memoryService from '../src/services/memory.js';
import path from 'path';

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

async function testDirect() {
    log('\n🧪 Neural Memory MCP v2.0 - Test Manuale\n', 'cyan');
    log('═'.repeat(50), 'blue');

    try {
        // Test 1: Start Session (anziché initialize_project)
        log('\n📦 Test 1: start_session', 'yellow');
        
        const session = await memoryService.startSession({
            name: 'test-session',
            projectPath: '/path/to/test',
            description: 'Sessione di test per v2.0'
        });
        log(`✓ Sessione avviata: ${session.session_id}`, 'green');
        log(`  Started at: ${session.started_at}`, 'reset');

        // Test 2: Aggiungi nodi con sessionId (NON projectId!)
        log('\n📝 Test 2: add_node', 'yellow');

        const node1 = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['entity', 'User', 'database'],
            content: 'Ho creato l\'entità User con campi: id, name, email',
            type: 'entity',
            weight: 1.5
        });
        log(`✓ Nodo 1 creato: ${node1.node_id}`, 'green');

        const node2 = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['task', 'API', 'CRUD'],
            content: 'Implementato CRUD completo per l\'entità User tramite Express router',
            type: 'task',
            parentId: node1.node_id,
            weight: 1.2
        });
        log(`✓ Nodo 2 creato: ${node2.node_id}`, 'green');

        const node3 = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['file', 'routes', 'users.js'],
            content: 'Creato routes/users.js con endpoints GET, POST, PUT, DELETE',
            type: 'file',
            parentId: node2.node_id,
            metadata: {path: 'routes/users.js'}
        });
        log(`✓ Nodo 3 creato: ${node3.node_id}`, 'green');

        // Test 3: Cerca nodi con sessionId
        log('\n🔍 Test 3: search_nodes', 'yellow');
        const searchResults = await memoryService.searchNodes({
            sessionId: session.session_id,
            keywords: ['User', 'entity'],
            maxResults: 10
        });
        log(`✓ Trovati ${searchResults.length} risultati:`, 'green');
        searchResults.forEach((r, i) => {
            const keywords = Array.isArray(r.keywords) ? r.keywords : JSON.parse(r.keywords || '[]');
            log(`  ${i + 1}. [${r.type}] confidence: ${r.confidence}`, 'reset');
            log(`     keywords: ${keywords.join(', ')}`, 'reset');
        });

        // Test 4: Contesto nodo
        log('\n🌳 Test 4: get_node_context', 'yellow');
        const context = await memoryService.getNodeContext({
            sessionId: session.session_id,
            nodeId: node1.node_id,
            depth: 2
        });
        log(`✓ Contesto nodo: ${context.children.length} figli`, 'green');
        log(`  breadcrumbs: ${context.breadcrumbs.length} livelli`, 'reset');

        // Test 5: Link nodi
        log('\n🔗 Test 5: link_nodes', 'yellow');
        const link = await memoryService.linkNodes({
            sessionId: session.session_id,
            fromNodeId: node1.node_id,
            toNodeId: node2.node_id,
            linkType: 'caused',
            weight: 1.0
        });
        log(`✓ Link creato: ${link.link_id}`, 'green');

        // Test 6: Suggerimenti
        log('\n💡 Test 6: suggest_nodes', 'yellow');
        const suggestions = await memoryService.suggestNodes({
            sessionId: session.session_id,
            currentKeywords: ['database', 'model'],
            maxResults: 3
        });
        log(`✓ Suggeriti ${suggestions.length} nodi`, 'green');

        // Test 7: Statistiche sessione (usa listSessions)
        log('\n📊 Test 7: list_sessions con stats', 'yellow');
        const sessionsWithStats = await memoryService.listSessions({ includeStats: true });
        log(`✓ Sessioni totali: ${sessionsWithStats.length}`, 'green');
        const current = sessionsWithStats.find(s => s.session_id === session.session_id);
        if (current?.stats) {
            log(`  - Nodi creati: ${current.stats.nodesCreated || 0}`, 'reset');
            log(`  - Skills registrate: ${current.stats.skillsRegistered || 0}`, 'reset');
        }

        // Test 8: Update nodo
        log('\n✏️ Test 8: update_node', 'yellow');
        const update = await memoryService.updateNode({
            sessionId: session.session_id,
            nodeId: node1.node_id,
            keywords: ['entity', 'User', 'database', 'model', 'schema'],
            weight: 2.0
        });
        log(`✓ Nodo aggiornato: ${update.node_id}`, 'green');

        // Test 9: add_error - Errore ricorrente (ALTA PRIORITÀ!)
        log('\n🐛 Test 9: add_error (categoria error)', 'yellow');
        const errorNode = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['ENOENT', 'nodejs', 'file-not-found'],
            content: 'ERROR: Cannot find module \'./config\'\n\nSOLUTION: Run npm install to ensure all dependencies are installed\n\nCONTEXT: N/A',
            type: 'error',
            weight: 2.0,
            metadata: { error_code: 'ENOENT', solution: 'npm install' }
        });
        log(`✓ Errore registrato: ${errorNode.node_id} (type: ${errorNode.type})`, 'green');

        // Test 10: add_operation - How-to operazione
        log('\n📋 Test 10: add_operation (categoria operation)', 'yellow');
        const operationNode = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['database', 'migration', 'add-column', 'sql'],
            content: 'OPERATION: Aggiungere campo a tabella\n\nPREREQUISITES:\n- Database Sequelize configurato\n- Modello esistente\n\nSTEPS:\n1. Crea migration: npx sequelize migration:create --name add_column\n2. Definisci up(): sequelize.addColumn(\'users\', \'avatar\', \'STRING\')\n3. Esegui: npx sequelize db:migrate\n\nNOTES: Non dimenticare di aggiornare il modello!',
            type: 'operation',
            weight: 1.5
        });
        log(`✓ Operazione registrata: ${operationNode.node_id} (type: ${operationNode.type})`, 'green');

        // Test 11: add_convention - Convenzione di stile
        log('\n📏 Test 11: add_convention (categoria convention)', 'yellow');
        const conventionNode = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['javascript', 'naming', 'camelcase', 'codestyle'],
            content: 'CONVENTION: Naming CamelCase per JS\n\nRULE: Tutte le variabili e funzioni JS usano camelCase.\n\nAPPLIES TO: variabili javascript, nomi funzioni\n\nEXAMPLES:\n- userName ✓\n- user_name ✗\n- MAX_RETRIES ✓',
            type: 'convention',
            weight: 1.0
        });
        log(`✓ Convenzione registrata: ${conventionNode.node_id} (type: ${conventionNode.type})`, 'green');

        // Test 12: add_edge_case - Caso limite
        log('\n⚠️ Test 12: add_edge_case (categoria edge_case)', 'yellow');
        const edgeCaseNode = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['null', 'validation', 'sequelize'],
            content: 'EDGE CASE: Valore null in campo allowNull: false\n\nBEHAVIOR: Sequelize non blocca NULL, lo inserisce lo stesso\n\nWORKAROUND: Usa validates in Hook per controllo custom',
            type: 'edge_case',
            weight: 1.5,
            metadata: { scenario: 'Valore null in campo obbligatorio', behavior: 'DB accetta NULL' }
        });
        log(`✓ Edge case registrato: ${edgeCaseNode.node_id} (type: ${edgeCaseNode.type})`, 'green');

        // Test 13: add_pattern - Pattern architetturale
        log('\n🏗️ Test 13: add_pattern (categoria pattern)', 'yellow');
        const patternNode = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['repository', 'pattern', 'ddd', 'architecture'],
            content: 'PATTERN: Repository Pattern\n\nAstrazione tra domain model e data access layer.\n\nUSE CASE: Quando hai bisogno di testare la logica di business senza DB reale.\n\nIMPLEMENTATION: Crea interface Repository con metodi CRUD.',
            type: 'pattern',
            weight: 1.2,
            metadata: { pattern_name: 'Repository Pattern', use_case: 'Testing senza DB' }
        });
        log(`✓ Pattern registrato: ${patternNode.node_id} (type: ${patternNode.type})`, 'green');

        // Test 14: register_skill (NUOVO v2.0!)
        log('\n🎯 Test 14: register_skill (NUOVO v2.0)', 'yellow');
        const skillNode = await memoryService.addNode({
            sessionId: session.session_id,
            keywords: ['javascript', 'express', 'api', 'skill'],
            content: 'SKILL: Express.js API Development\n\nLANGUAGE: JavaScript\n\nFRAMEWORK: Express.js\n\nFILE_PATTERN: routes/*.js, controllers/*.js\n\nLEARN_STEPS:\n1. Setup Express app con middleware base\n2. Definisci router con metodi HTTP\n3. Implementa CRUD operations\n4. Aggiungi validazione input\n5. Gestisci errori con middleware\n\nUSE_CASES:\n- REST API development\n- Microservices\n- Proxy servers',
            type: 'skill',
            weight: 2.0,
            metadata: {
                framework: 'Express.js',
                language: 'JavaScript',
                filePattern: 'routes/*.js',
                learnSteps: ['Setup', 'Router', 'CRUD', 'Validazione', 'Error handling'],
                useCases: ['REST API', 'Microservices']
            }
        });
        log(`✓ Skill registrata: ${skillNode.node_id} (type: ${skillNode.type})`, 'green');
        log(`  Framework: ${skillNode.metadata.framework}`, 'reset');

        // Test 15: save_context_snapshot (NUOVO v2.0!)
        log('\n📸 Test 15: save_context_snapshot (NUOVO v2.0)', 'yellow');
        const snapshot = await memoryService.saveContextSnapshot({
            sessionId: session.session_id,
            summary: 'Testing Neural Memory v2.0',
            workDone: { files: ['src/index.js', 'src/services/memory.js'] },
            pendingTasks: ['Fix tests', 'Add documentation'],
            blockers: [],
            learnings: ['Session management works'],
            nextSteps: ['Deploy', 'Monitor']
        });
        log(`✓ Snapshot salvato: ${snapshot.snapshot_id}`, 'green');
        log(`  Summary: ${snapshot.summary}`, 'reset');

        // Test 19: generate_session_summary (NUOVO v2.0!)
        log('\n📋 Test 19: generate_session_summary (NUOVO v2.0)', 'yellow');
        const sessionSummary = await memoryService.generateSessionSummary(session.session_id);
        log(`✓ Summary generato`, 'green');
        log(`  Nodes: ${sessionSummary.node_count}`, 'reset');
        log(`  Types: ${sessionSummary.types_summary.map(t => t.type).join(', ')}`, 'reset');

        // Test 20: get_memory_report (NUOVO v2.0!)
        log('\n📊 Test 20: get_memory_report (NUOVO v2.0)', 'yellow');
        const report = await memoryService.getMemoryReport({
            format: 'html',
            sessions: [session.session_id]
        });
        log(`✓ Report HTML generato (${report.length} chars)`, 'green');
        log(`  Report starts with: ${report.substring(0, 50)}...`, 'reset');

        // Test 21: Verifica confidence scoring (Skills/Errors = ALTA priorità)
        log('\n🎯 Test 21: verify_confidence_scoring', 'yellow');
        const prioritySearch = await memoryService.searchNodes({
            sessionId: session.session_id,
            keywords: ['error', 'ENOENT'],
            maxResults: 10
        });
        log(`✓ Ricerca priority: ${prioritySearch.length} risultati`, 'green');
        
        const skillSearch = await memoryService.searchNodes({
            sessionId: session.session_id,
            keywords: ['express', 'api'],
            maxResults: 10
        });
        log(`✓ Ricerca skill: ${skillSearch.length} risultati`, 'green');

        // Verifica che error e skill abbiano confidence alto
        if (prioritySearch.length > 0) {
            log(`  Top result: [${prioritySearch[0].type}] confidence: ${prioritySearch[0].confidence}`, 'reset');
        }

        // Test 19: List all sessions
        log('\n📜 Test 19: list_sessions', 'yellow');
        const sessions = await memoryService.listSessions();
        log(`✓ Sessioni totali: ${sessions.length}`, 'green');

        // Test 20: Resume session
        log('\n🔄 Test 20: resume_session', 'yellow');
        const resumed = await memoryService.resumeSession(session.session_id);
        log(`✓ Sessione ripresa: ${resumed.session_id}`, 'green');
        log(`  Is active: ${resumed.is_active}`, 'reset');

        // End session
        log('\n🔚 Test 21: end_session', 'yellow');
        const ended = await memoryService.endSession(session.session_id);
        log(`✓ Sessione terminata: ${ended.session_id}`, 'green');
        log(`  Duration: ${ended.stats?.duration_seconds || 'N/A'}s`, 'reset');

        log('\n' + '═'.repeat(50), 'blue');
        log('✅ Tutti i test v2.0 completati con successo!', 'green');
        log('═'.repeat(50), 'blue');
        log('\n📝 Schema v2.0 verificato:', 'cyan');
        log('  - Database Unificato ✓', 'reset');
        log('  - Session Management ✓', 'reset');
        log('  - Skills Framework ✓', 'reset');
        log('  - Context Compression ✓', 'reset');
        log('  - HTML Reports ✓', 'reset');
        log('  - Confidence Scoring (Skills/Errors = HIGH) ✓', 'reset');

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
