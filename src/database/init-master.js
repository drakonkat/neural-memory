/**
 * Master Database Initialization
 * Crea il database master che tiene traccia di tutti i progetti
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Database master path
const MASTER_DB_PATH = path.join(__dirname, '../../data/master.sqlite');

let masterSequelize = null;
let models = null;

/**
 * Inizializza il database master
 */
async function initMasterDb() {
  // Assicurati che la directory esista
  const dataDir = path.dirname(MASTER_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Crea connessione Sequelize per il DB master
  masterSequelize = new Sequelize({
    dialect: 'sqlite',
    storage: MASTER_DB_PATH,
    logging: false
  });

  // Definisci modelli inline per il master DB
  const Project = masterSequelize.define('Project', {
    id: {
      type: Sequelize.DataTypes.UUID,
      defaultValue: Sequelize.DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    path: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.DataTypes.TEXT,
      defaultValue: ''
    },
    metadata: {
      type: Sequelize.DataTypes.JSON,
      defaultValue: {}
    },
    stats: {
      type: Sequelize.DataTypes.JSON,
      defaultValue: { totalNodes: 0, lastActivity: null }
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    underscored: true
  });

  // Sync database (force: true per ricreare tabelle)
  await masterSequelize.sync({ force: true });

  return { sequelize: masterSequelize, Project };
}

/**
 * Ottieni il database master
 */
async function getMasterDb() {
  if (!masterSequelize) {
    models = await initMasterDb();
  }
  return models;
}

/**
 * Chiudi connessione master
 */
async function closeMasterDb() {
  if (masterSequelize) {
    await masterSequelize.close();
    masterSequelize = null;
    models = null;
  }
}

module.exports = {
  initMasterDb,
  getMasterDb,
  closeMasterDb,
  MASTER_DB_PATH
};
