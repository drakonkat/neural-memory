/**
 * Database Connection Manager
 * Gestisce connessioni Sequelize per ogni progetto (1 DB per progetto)
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const connections = new Map();

// Directory per i database
const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Inizializza la directory dei dati se non esiste
 */
function initDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Ottiene o crea una connessione Sequelize per un progetto
 * @param {string} projectId - ID del progetto
 * @param {string} dbPath - Percorso opzionale al DB (se non fornito, usa DATA_DIR)
 * @returns {Sequelize} - Istanza Sequelize
 */
function getConnection(projectId, dbPath = null) {
  // Se esiste già la connessione, restituiscila
  if (connections.has(projectId)) {
    return connections.get(projectId);
  }

  initDataDir();

  // Crea nuovo percorso DB
  const databasePath = dbPath || path.join(DATA_DIR, `${projectId}.sqlite`);
  
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: databasePath,
    logging: false, // Imposta true per debug
    define: {
      timestamps: true,
      underscored: true
    }
  });

  connections.set(projectId, sequelize);
  return sequelize;
}

/**
 * Chiude la connessione per un progetto
 * @param {string} projectId 
 */
async function closeConnection(projectId) {
  if (connections.has(projectId)) {
    const sequelize = connections.get(projectId);
    await sequelize.close();
    connections.delete(projectId);
  }
}

/**
 * Chiude tutte le connessioni
 */
async function closeAllConnections() {
  for (const [projectId, sequelize] of connections) {
    await sequelize.close();
  }
  connections.clear();
}

/**
 * Verifica se una connessione esiste
 * @param {string} projectId 
 * @returns {boolean}
 */
function hasConnection(projectId) {
  return connections.has(projectId);
}

/**
 * Lista tutti i progetti connessi
 * @returns {string[]}
 */
function getConnectedProjects() {
  return Array.from(connections.keys());
}

module.exports = {
  getConnection,
  closeConnection,
  closeAllConnections,
  hasConnection,
  getConnectedProjects,
  initDataDir,
  DATA_DIR
};
