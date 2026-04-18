/**
 * Models Index
 * Esporta tutti i modelli - DB separati, NO foreign keys
 */

const ProjectModel = require('./Project');
const NodeModel = require('./Node');
const LinkModel = require('./Link');

/**
 * Inizializza tutti i modelli con Sequelize
 * @param {Sequelize} sequelize 
 * @returns {Object} - { Project, Node, Link }
 */
function initModels(sequelize) {
  const Project = ProjectModel(sequelize);
  const Node = NodeModel(sequelize);
  const Link = LinkModel(sequelize);
  
  // NOTA: I DB sono separati, niente foreign key constraints!
  // Le relazioni sono gestite via software, non via FK
  
  return { Project, Node, Link };
}

module.exports = { initModels };
