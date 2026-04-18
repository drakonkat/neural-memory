/**
 * Link Model
 * Rappresenta collegamenti tra nodi (gerarchia + riferimenti)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Link', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    fromNodeId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Nodo sorgente'
    },
    toNodeId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Nodo destinazione'
    },
    linkType: {
      type: DataTypes.STRING,
      defaultValue: 'related',
      comment: 'Tipo: child, parent, related, reference, trigger, caused'
    },
    weight: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
      comment: 'Peso del collegamento (0.1 - 10.0)'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Dati aggiuntivi sul collegamento'
    }
  }, {
    tableName: 'node_links',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    indexes: [
      { fields: ['from_node_id'] },
      { fields: ['to_node_id'] },
      { fields: ['link_type'] },
      { fields: ['from_node_id', 'link_type'] }
    ]
  });
};
