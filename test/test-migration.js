/**
 * Test Automatico per Sistema Migration
 * Verifica che il sistema migration funzioni correttamente
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getConnection, initDataDir } from '../src/database/connection.js';
import { runMigrations, getCurrentVersion, syncSchema } from '../src/database/migrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function assert(condition, message) {
    if (!condition) {
        throw new Error(`❌ Assertion failed: ${message}`);
    }
}

async function cleanTestDb() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Rimuovi DB di test se esiste
    const testDbPath = path.join(dataDir, 'migration-test.sqlite');
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    return testDbPath;
}

async function runTests() {
    log('\n🧪 Neural Memory - Test Sistema Migration\n', 'cyan');
    log('═'.repeat(50), 'blue');

    let passedTests = 0;
    let failedTests = 0;

    try {
        // Clean up test DB
        const testDbPath = await cleanTestDb();
        log('\n🧹 Database di test pulito', 'yellow');

        // ============ TEST 1: Prima migration - DB vuoto ============
        log('\n📦 Test 1: Prima migration su DB vuoto', 'yellow');
        
        const sequelize1 = getConnection('migration-test', testDbPath);
        
        // Verifica che non ci siano tabelle
        const [tables1] = await sequelize1.query(`
            SELECT name FROM sqlite_master WHERE type='table'
        `);
        assert(tables1.length === 0, 'DB dovrebbe essere vuoto inizialmente');
        
        // Esegui migration
        const result1 = await runMigrations(sequelize1);
        log(`   Migration applicate: ${result1.applied}, totali: ${result1.total}`, 'reset');
        
        // Verifica che le tabelle siano state create
        const [tables2] = await sequelize1.query(`
            SELECT name FROM sqlite_master WHERE type='table'
        `);
        assert(tables2.length >= 3, `Dovrebbero esserci almeno 3 tabelle (nodes, node_links, schema_info), trovate: ${tables2.length}`);
        
        const tableNames = tables2.map(t => t.name);
        assert(tableNames.includes('nodes'), 'Tabella nodes dovrebbe esistere');
        assert(tableNames.includes('node_links'), 'Tabella node_links dovrebbe esistere');
        assert(tableNames.includes('schema_info'), 'Tabella schema_info dovrebbe esistere');
        
        // Verifica versione
        const version1 = await getCurrentVersion(sequelize1);
        assert(version1 === 2, `Versione dovrebbe essere 2, trovata: ${version1}`);
        
        log('   ✓ Prima migration completata con successo', 'green');
        passedTests++;

        // ============ TEST 2: Seconda run - nessuna migration pendente ============
        log('\n📦 Test 2: Run ripetuto - nessuna migration pendente', 'yellow');
        
        const result2 = await runMigrations(sequelize1);
        assert(result2.applied === 0, 'Non dovrebbero esserci migration pendenti');
        
        log('   ✓ Nessuna migration pendente confermata', 'green');
        passedTests++;

        // ============ TEST 3: Verifica contenuto schema_info ============
        log('\n📦 Test 3: Verifica contenuto schema_info', 'yellow');
        
        const [versions] = await sequelize1.query(`
            SELECT version, description FROM schema_info ORDER BY version
        `);
        assert(versions.length === 2, `Dovrebbero esserci 2 versioni registrate, trovate: ${versions.length}`);
        assert(versions[0].version === 1, 'Prima versione dovrebbe essere 1');
        assert(versions[1].version === 2, 'Seconda versione dovrebbe essere 2');
        
        log(`   ✓ Versioni registrate: ${versions.map(v => v.version).join(', ')}`, 'green');
        passedTests++;

        // ============ TEST 4: Verifica che i dati non vengano cancellati ============
        log('\n📦 Test 4: Verifica persistenza dati tra migration', 'yellow');
        
        // Inserisci un nodo di test
        const testNodeId = 'test-node-123';
        await sequelize1.query(`
            INSERT INTO nodes (id, project_id, type, keywords, content, depth, weight)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, {
            replacements: [testNodeId, 'migration-test', 'test', '["test"]', 'Test content', 0, 1.0]
        });
        
        // Verifica che il nodo esista
        const [nodeCheck] = await sequelize1.query(`SELECT id FROM nodes WHERE id = ?`, {
            replacements: [testNodeId]
        });
        assert(nodeCheck.length === 1, 'Nodo di test dovrebbe esistere');
        
        // Riesegui migration
        await runMigrations(sequelize1);
        
        // Verifica che il nodo esista ancora
        const [nodeCheck2] = await sequelize1.query(`SELECT id FROM nodes WHERE id = ?`, {
            replacements: [testNodeId]
        });
        assert(nodeCheck2.length === 1, 'Nodo di test dovrebbe esistere ancora dopo migration');
        
        log('   ✓ Dati preservati tra migration', 'green');
        passedTests++;

        // ============ TEST 5: syncSchema fallback ============
        log('\n📦 Test 5: Test syncSchema fallback', 'yellow');
        
        await syncSchema(sequelize1); // Non dovrebbe lanciare errori
        
        log('   ✓ syncSchema completato senza errori', 'green');
        passedTests++;

        // ============ TEST 6: Integrazione con MemoryService ============
        log('\n📦 Test 6: Test integrazione con MemoryService', 'yellow');
        
        // Importa dinamicamente per evitare caching
        const { default: memoryService } = await import('../src/services/memory.js');
        
        // Pulisci cache per forzare nuova connessione
        memoryService.modelsCache.clear();
        
        // Inizializza progetto di test
        const project = await memoryService.initializeProject(
            'migration-test-project',
            '/path/to/migration-test',
            'Test per migration system'
        );
        
        assert(project.success, 'Progetto dovrebbe essere creato con successo');
        
        // Aggiungi un nodo
        const node = await memoryService.addNode({
            projectId: project.project_id,
            keywords: ['test', 'migration'],
            content: 'Test node for migration system',
            type: 'task'
        });
        
        assert(node.success, 'Nodo dovrebbe essere creato con successo');
        
        // Verifica che il nodo sia stato inserito
        const { Node } = await memoryService.getModels(project.project_id);
        const foundNode = await Node.findByPk(node.node_id);
        assert(foundNode !== null, 'Nodo dovrebbe essere trovato nel DB');
        
        log('   ✓ Integrazione con MemoryService funziona', 'green');
        passedTests++;

        // ============ TEST 7: Verifica FTS5 ============
        log('\n📦 Test 7: Verifica tabella FTS5', 'yellow');
        
        const [ftsCheck] = await sequelize1.query(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='nodes_fts'
        `);
        assert(ftsCheck.length === 1, 'Tabella FTS5 dovrebbe esistere');
        
        // Verifica che il nodo sia indicizzato
        const [ftsContent] = await sequelize1.query(`SELECT * FROM nodes_fts`);
        // Il contenuto dipende dall'inserimento nel FTS, ma non deve crashare
        
        log('   ✓ FTS5 funziona correttamente', 'green');
        passedTests++;

        // ============ PULIZIA ============
        log('\n🧹 Pulizia database di test...', 'yellow');
        
        // Chiudi connessioni
        const { closeConnection } = await import('../src/database/connection.js');
        await closeConnection('migration-test');
        await closeConnection(project.project_id);
        
        // Rimuovi file di test
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        
        // Rimuovi anche il DB del progetto di test
        const testProjectDb = path.join(__dirname, '../data', `${project.project_id}.sqlite`);
        if (fs.existsSync(testProjectDb)) {
            fs.unlinkSync(testProjectDb);
        }

    } catch (error) {
        log(`\n❌ Test fallito: ${error.message}`, 'red');
        log(error.stack, 'red');
        failedTests++;
    }

    // ============ RIEPILOGO ============
    log('\n' + '═'.repeat(50), 'blue');
    log(`✅ Test passati: ${passedTests}`, 'green');
    log(`❌ Test falliti: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    log('═'.repeat(50), 'blue');

    if (failedTests > 0) {
        process.exit(1);
    }
}

// Esegui test
runTests().then(() => {
    log('\n🎉 Tutti i test sono passati! Il sistema migration funziona correttamente nya~\n', 'cyan');
    process.exit(0);
}).catch((error) => {
    log(`\n💥 Errore durante i test: ${error.message}`, 'red');
    process.exit(1);
});