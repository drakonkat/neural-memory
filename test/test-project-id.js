/**
 * Test per project_id auto-detect
 */
import memoryService from '../src/services/memory.js';
import fs from 'fs';
import path from 'path';

const TEST_PATH = 'E:/Project/TND/test-auto-detect-project';

async function test() {
    console.log('🧪 Test project_id auto-detect\n');

    // Cleanup file se esiste
    const idFile = path.join(TEST_PATH, '.neural-memory-id');
    if (fs.existsSync(idFile)) {
        fs.unlinkSync(idFile);
        console.log('🗑️  Rimosso file .neural-memory-id esistente');
    }

    // Test 1: Crea progetto
    console.log('\n📦 Test 1: get_or_create_project');
    const result1 = await memoryService.getOrCreateProject(
        'test-auto-detect',
        TEST_PATH,
        'Test per auto-detect'
    );
    console.log('✅ Risultato:', JSON.stringify(result1, null, 2));

    // Verifica che il file sia stato creato
    if (fs.existsSync(idFile)) {
        const content = fs.readFileSync(idFile, 'utf-8');
        console.log('✅ File .neural-memory-id creato:', content);
    } else {
        console.log('❌ File .neural-memory-id NON creato!');
    }

    // Test 2: Risolvi project_id da path
    console.log('\n📍 Test 2: resolveProjectId');
    const projectId = await memoryService.resolveProjectId(TEST_PATH);
    console.log('✅ Project ID risolto:', projectId);

    // Test 3: Risolvi da file locale
    console.log('\n📍 Test 3: resolveProjectId (stesso path, dovrebbe usare file)');
    const projectId2 = await memoryService.resolveProjectId(TEST_PATH);
    console.log('✅ Project ID (da file):', projectId2);

    // Test 4: Aggiungi nodo usando resolveProjectId
    console.log('\n📝 Test 4: add_node con resolveProjectId');
    const node = await memoryService.addNode({
        projectId: projectId,
        keywords: ['test', 'auto-detect', 'project-id'],
        content: 'Nodo creato con project_id auto-detected',
        type: 'task',
        weight: 1.5
    });
    console.log('✅ Nodo creato:', JSON.stringify(node, null, 2));

    // Test 5: Cerca nodi
    console.log('\n🔍 Test 5: search_nodes');
    const results = await memoryService.searchNodes({
        projectId: projectId,
        keywords: ['test', 'auto-detect'],
        maxResults: 5
    });
    console.log('✅ Risultati:', results.length);

    // Cleanup
    fs.unlinkSync(idFile);
    console.log('\n🧹 Cleanup completato');

    console.log('\n✅ Tutti i test completati!');
}

test().catch(e => {
    console.error('❌ Errore:', e.message);
    console.error(e.stack);
    process.exit(1);
});
