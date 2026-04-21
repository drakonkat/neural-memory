/**
 * Database Migrator
 * Sistema automatico di migration per preservare i dati tra modifiche schema
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Definizione delle migration
 * Ogni migration ha: version, description, up()
 */
const migrations = [
  {
    version: 1,
    description: 'Initial schema - create tables',
    async up(sequelize) {
      // Leggi SQL raw per compatibilità
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS schema_info (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          description TEXT
        )
      `);

      // Node table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS nodes (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          parent_id TEXT,
          type TEXT DEFAULT 'generic',
          keywords TEXT DEFAULT '[]',
          content TEXT,
          metadata TEXT DEFAULT '{}',
          depth INTEGER DEFAULT 0,
          weight REAL DEFAULT 1.0,
          keyword_count INTEGER DEFAULT 0,
          task_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Node links table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS node_links (
          id TEXT PRIMARY KEY,
          from_node_id TEXT NOT NULL,
          to_node_id TEXT NOT NULL,
          link_type TEXT DEFAULT 'related',
          weight REAL DEFAULT 1.0,
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Indici per Node
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id)`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id)`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_nodes_created ON nodes(created_at)`);

      // Indici per Link
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_links_from ON node_links(from_node_id)`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_links_to ON node_links(to_node_id)`);

      // Inserisci versione iniziale
      await sequelize.query(`
        INSERT OR IGNORE INTO schema_info (version, description) VALUES (1, 'Initial schema - create tables')
      `);
    }
  },
  {
    version: 2,
    description: 'Add FTS5 full-text search support',
    async up(sequelize) {
      // Crea tabella FTS5 se non esiste (SQLite virtual table)
      await sequelize.query(`
        CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
          node_id UNINDEXED,
          keywords,
          content,
          content_rowid='rowid'
        )
      `);

      // Inserisci versione
      await sequelize.query(`
        INSERT OR IGNORE INTO schema_info (version, description) VALUES (2, 'Add FTS5 full-text search support')
      `);
    }
  }
];

/**
 * Ottiene la versione corrente dello schema
 * @param {Sequelize} sequelize
 * @returns {Promise<number>}
 */
async function getCurrentVersion(sequelize) {
  try {
    // Verifica se la tabella schema_info esiste
    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='schema_info'
    `);

    if (!tables || tables.length === 0) {
      return 0; // Nessuna migration applicata
    }

    // Ottieni la versione massima
    const [result] = await sequelize.query(`
      SELECT MAX(version) as version FROM schema_info
    `);

    return result[0]?.version || 0;
  } catch (error) {
    // Se c'è errore (tabella non esiste), restituisci 0
    return 0;
  }
}

/**
 * Esegue le migration pendenti
 * @param {Sequelize} sequelize
 * @returns {Promise<{applied: number, total: number}>}
 */
async function runMigrations(sequelize) {
  const currentVersion = await getCurrentVersion(sequelize);
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    return { applied: 0, total: 0 };
  }

  console.log(`[Migrator] Found ${pendingMigrations.length} pending migrations`);

  for (const migration of pendingMigrations) {
    try {
      console.log(`[Migrator] Applying migration v${migration.version}: ${migration.description}`);
      await migration.up(sequelize);
      console.log(`[Migrator] ✓ Migration v${migration.version} applied successfully`);
    } catch (error) {
      console.error(`[Migrator] ✗ Migration v${migration.version} failed:`, error.message);
      // Non fermare le altre migration, ma logga l'errore
    }
  }

  return { 
    applied: pendingMigrations.length, 
    total: migrations.length 
  };
}

/**
 * Verifica se una tabella esiste
 * @param {Sequelize} sequelize
 * @param {string} tableName
 * @returns {Promise<boolean>}
 */
async function tableExists(sequelize, tableName) {
  const [tables] = await sequelize.query(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `, {
    replacements: [tableName]
  });
  return tables && tables.length > 0;
}

/**
 * Sincronizza schema senza cancellare dati (usato come fallback)
 * Crea tabelle mancanti ma non rimuove dati esistenti
 * @param {Sequelize} sequelize
 * @returns {Promise<void>}
 */
async function syncSchema(sequelize) {
  // Verifica e crea tabella nodes se non esiste
  if (!(await tableExists(sequelize, 'nodes'))) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        parent_id TEXT,
        type TEXT DEFAULT 'generic',
        keywords TEXT DEFAULT '[]',
        content TEXT,
        metadata TEXT DEFAULT '{}',
        depth INTEGER DEFAULT 0,
        weight REAL DEFAULT 1.0,
        keyword_count INTEGER DEFAULT 0,
        task_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Verifica e crea tabella node_links se non esiste
  if (!(await tableExists(sequelize, 'node_links'))) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS node_links (
        id TEXT PRIMARY KEY,
        from_node_id TEXT NOT NULL,
        to_node_id TEXT NOT NULL,
        link_type TEXT DEFAULT 'related',
        weight REAL DEFAULT 1.0,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Verifica e crea FTS5 se non esiste
  if (!(await tableExists(sequelize, 'nodes_fts'))) {
    await sequelize.query(`
      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        node_id UNINDEXED,
        keywords,
        content,
        content_rowid='rowid'
      )
    `);
  }
}

export {
  runMigrations,
  getCurrentVersion,
  syncSchema,
  tableExists,
  migrations
};