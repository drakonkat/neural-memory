/**
 * Memory Service
 * Logica di business per la gestione della memoria neurale
 */

import {v4 as uuidv4} from 'uuid';
import {getConnection, initDataDir} from '../database/connection.js';
import {initMasterDb, getMasterDb} from '../database/init-master.js';
import {initModels} from '../database/models/index.js';
import {runMigrations} from '../database/migrator.js';
import {writeLocalProjectId, readLocalProjectId, getProjectIdFromPath} from './project-helper.js';

class MemoryService {
    constructor() {
        // Cache dei modelli per progetto
        this.modelsCache = new Map();
        this.masterInitialized = false;
    }

    /**
     * Ottiene project_id dato un path, con auto-creazione file locale
     * @param {string} projectPath - Percorso del progetto
     * @param {boolean} autoCreate - Se creare il progetto se non esiste
     * @returns {Promise<string|null>}
     */
    async resolveProjectId(projectPath, autoCreate = false) {
        await this.ensureMasterDb();
        const masterModels = await this.getModels('master');
        return await getProjectIdFromPath(projectPath, masterModels);
    }

    /**
     * Ottiene o crea un progetto, scrivendo anche il file .neural-memory-id
     * @param {string} name - Nome del progetto
     * @param {string} projectPath - Percorso del progetto
     * @param {string} description - Descrizione opzionale
     * @returns {Object} Risultato con project_id, name, is_new
     */
    async getOrCreateProject(name, projectPath, description = '') {
        initDataDir();
        await this.ensureMasterDb();
        const masterModels = await this.getModels('master');
        const {Project} = masterModels;

        // Cerca progetto esistente per path
        let project = await Project.findOne({where: {path: projectPath}});
        let isNew = false;

        if (!project) {
            // Crea nuovo progetto
            project = await Project.create({
                name,
                path: projectPath,
                description
            });
            isNew = true;

            // Inizializza DB per il progetto
            const {Node} = await this.getModels(project.id);
            await runMigrations(getConnection(project.id));

            // Crea nodo radice
            await Node.create({
                projectId: project.id,
                type: 'root',
                keywords: [name.toLowerCase()],
                content: `Project root for ${name}`,
                depth: 0
            });
        }

        // Scrivi sempre il file locale (sovrascrive per sicurezza)
        writeLocalProjectId(projectPath, project.id);

        return {
            project_id: project.id,
            project_name: project.name,
            path: project.path,
            is_new: isNew,
            success: true
        };
    }

    /**
     * Inizializza il database master (una volta sola)
     */
    async ensureMasterDb() {
        if (!this.masterInitialized) {
            await getMasterDb();
            this.masterInitialized = true;
        }
    }

    /**
     * Ottiene i modelli per un progetto (con cache)
     * @param {string} projectId
     * @returns {Object} { Project, Node, Link }
     */
    async getModels(projectId) {
        if (this.modelsCache.has(projectId)) {
            return this.modelsCache.get(projectId);
        }

        const sequelize = getConnection(projectId);
        const models = initModels(sequelize);

        // Esegue migration automatiche per creare tabelle mancanti
        // SENZA cancellare dati esistenti!
        await runMigrations(sequelize);

        this.modelsCache.set(projectId, models);

        return models;
    }

    /**
     * Inizializza un nuovo progetto
     * @param {string} name - Nome del progetto
     * @param {string} projectPath - Percorso del progetto
     * @param {string} description - Descrizione opzionale
     * @returns {Object} { project_id, name, success }
     */
    async initializeProject(name, projectPath, description = '') {
        initDataDir();

        // Assicura che il master DB sia inizializzato
        await this.ensureMasterDb();
        const {Project} = await this.getModels('master');

        // Verifica se il progetto esiste già
        const existing = await Project.findOne({where: {path: projectPath}});
        if (existing) {
            return {
                project_id: existing.id,
                name: existing.name,
                success: true,
                message: 'Project already exists'
            };
        }

        // Crea nuovo progetto nel DB master
        const project = await Project.create({
            name,
            path: projectPath,
            description
        });

        // Inizializza DB specifico per il progetto
        const {Node} = await this.getModels(project.id);

        // Crea nodo radice per il progetto
        const rootNode = await Node.create({
            projectId: project.id,
            type: 'root',
            keywords: [name.toLowerCase()],
            content: `Project root for ${name}`,
            depth: 0
        });

        // Le tabelle vengono create automaticamente dalle migration
        return {
            project_id: project.id,
            name: project.name,
            root_node_id: rootNode.id,
            success: true
        };
    }

    /**
     * Aggiunge un nodo alla memoria
     * @param {Object} params
     * @returns {Object} { node_id, confidence_score }
     */
    async addNode({
                      projectId,
                      keywords = [],
                      content = '',
                      type = 'generic',
                      parentId = null,
                      metadata = {},
                      weight = 1.0
                  }) {
        const {Node} = await this.getModels(projectId);

        // Calcola profondità
        let depth = 0;
        if (parentId) {
            const parent = await Node.findByPk(parentId);
            if (parent) {
                depth = parent.depth + 1;
            }
        }

        // Crea il nodo
        const node = await Node.create({
            projectId,
            parentId,
            type,
            keywords,
            content,
            metadata,
            depth,
            weight,
            keywordCount: keywords.length
        });

        // Aggiorna FTS5
        await this.updateFTS5(projectId, node);

        // Aggiorna statistiche progetto
        await this.updateProjectStats(projectId);

        return {
            node_id: node.id,
            type: node.type,
            depth: node.depth,
            keywords_count: keywords.length,
            success: true
        };
    }

    /**
     * Aggiorna l'indice FTS5 per un nodo
     * @param {string} projectId
     * @param {Object} node
     */
    async updateFTS5(projectId, node) {
        const sequelize = getConnection(projectId);

        // Inserisci/aggiorna nel FTS (SQLite specifico)
        // @ts-ignore - FTS5 non è supportato nativamente da Sequelize
        await sequelize.query(`
      INSERT INTO nodes_fts(node_id, keywords, content)
      VALUES (?, ?, ?)
    `, {
            replacements: [
                node.id,
                JSON.stringify(node.keywords),
                node.content || ''
            ]
        });
    }

    /**
     * Cerca nodi per keywords
     * @param {Object} params
     * @returns {Array} Risultati con confidence score
     */
    async searchNodes({
                          projectId,
                          keywords = [],
                          maxResults = 10,
                          minConfidence = 0.1,
                          type = null
                      }) {
        const {Node} = await this.getModels(projectId);

        if (keywords.length === 0) {
            return [];
        }

        // Costruisci query FTS5
        const searchQuery = keywords.join(' OR ');

        let ftsQuery;
        try {
            // Query FTS5 per ranking (SQLite specifico)
            // @ts-ignore - FTS5 non è supportato nativamente da Sequelize
            const results = await getConnection(projectId).query(`
        SELECT node_id, bm25(nodes_fts) as bm25_score
        FROM nodes_fts
        WHERE nodes_fts MATCH ?
        ORDER BY bm25(nodes_fts)
        LIMIT ?
      `, {
                replacements: [searchQuery, maxResults * 2]
            });

            ftsQuery = results[0] || [];
        } catch (error) {
            // FTS5 potrebbe non essere pronto, usa fallback
            ftsQuery = [];
        }

        // Mappa risultati FTS
        const ftsMap = new Map();
        for (const row of ftsQuery) {
            ftsMap.set(row.node_id, row.bm25_score);
        }

        // Recupera nodi e calcola confidence
        const whereClause = {projectId};
        if (type) {
            whereClause.type = type;
        }

        const nodes = await Node.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: maxResults * 3
        });

        // Calcola confidence per ogni nodo
        const scoredNodes = nodes.map(node => {
            const confidence = this.calculateConfidence(node, keywords, ftsMap);
            return {
                node_id: node.id,
                type: node.type,
                keywords: node.keywords,
                content: node.content,
                depth: node.depth,
                parent_id: node.parentId,
                confidence: Math.round(confidence * 100) / 100,
                created_at: node.created_at
            };
        });

        // Filtra per confidence minima e ordina
        return scoredNodes
            .filter(n => n.confidence >= minConfidence)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, maxResults);
    }

    /**
     * Calcola score di confidence per un nodo
     * @param {Object} node
     * @param {Array} searchKeywords
     * @param {Map} ftsMap
     * @returns {number} Confidence 0.0 - 1.0
     */
    calculateConfidence(node, searchKeywords, ftsMap) {
        let score = 0;

        // 1. BM25 score normalizzato (0-0.4)
        const bm25 = ftsMap.get(node.id) || 0;
        const normalizedBm25 = Math.max(0, Math.min(0.4, -bm25 / 10));

        // 2. Keyword match (0-0.3) - gestisce sia array che JSON string
        let keywords = node.keywords;
        if (typeof keywords === 'string') {
            try {
                keywords = JSON.parse(keywords);
            } catch (e) {
                keywords = [];
            }
        }
        if (!Array.isArray(keywords)) {
            keywords = [];
        }
        const matchedKeywords = (keywords).filter(k =>
            searchKeywords.some(sk =>
                k.toLowerCase().includes(sk.toLowerCase()) ||
                sk.toLowerCase().includes(k.toLowerCase())
            )
        ).length;
        const keywordScore = searchKeywords.length > 0
            ? (matchedKeywords / searchKeywords.length) * 0.3
            : 0;

        // 3. Recency bonus (0-0.15)
        const ageInDays = (Date.now() - new Date(node.created_at)) / (1000 * 60 * 60 * 24);
        const recencyScore = ageInDays < 1 ? 0.15 :
            ageInDays < 7 ? 0.10 :
                ageInDays < 30 ? 0.05 : 0;

        // 4. Type bonus (0-0.1)
        const typeScore = node.type === 'task' ? 0.1 : 0.05;

        // 5. Weight manuale (0-0.05)
        const weightScore = Math.min(0.05, (node.weight || 1.0) * 0.01);

        return Math.min(1.0, normalizedBm25 + keywordScore + recencyScore + typeScore + weightScore);
    }

    /**
     * Ottiene contesto di un nodo (navigazione gerarchica)
     * @param {Object} params
     * @returns {Object}
     */
    async getNodeContext({projectId, nodeId, depth = 1}) {
        const {Node, Link} = await this.getModels(projectId);

        const node = await Node.findByPk(nodeId);
        if (!node) {
            throw new Error('Node not found');
        }

        // Breadcrumbs (percorso verso la radice)
        const breadcrumbs = await this.getBreadcrumbs(projectId, nodeId);

        // Figli diretti
        const children = await Node.findAll({
            where: {parentId: nodeId},
            order: [['created_at', 'DESC']]
        });

        // Link in uscita (senza include per evitare errori di associazione)
        const outgoingLinks = await Link.findAll({
            where: {fromNodeId: nodeId}
        });

        // Recupera nodi target per i link
        const targetIds = outgoingLinks.map(l => l.toNodeId);
        const targetNodes = targetIds.length > 0
            ? await Node.findAll({where: {id: targetIds}})
            : [];
        const nodeMap = new Map(targetNodes.map(n => [n.id, n]));

        // Se depth > 1, recupera anche nipoti
        let grandchildren = [];
        if (depth > 1 && children.length > 0) {
            const childIds = children.map(c => c.id);
            grandchildren = await Node.findAll({
                where: {parentId: childIds},
                limit: 20,
                order: [['created_at', 'DESC']]
            });
        }

        return {
            node: {
                id: node.id,
                type: node.type,
                keywords: node.keywords,
                content: node.content,
                metadata: node.metadata,
                depth: node.depth,
                weight: node.weight,
                created_at: node.created_at
            },
            breadcrumbs,
            children: children.map(c => ({
                id: c.id,
                type: c.type,
                keywords: c.keywords,
                content: c.content?.substring(0, 200),
                depth: c.depth
            })),
            grandchildren: grandchildren.map(c => ({
                id: c.id,
                type: c.type,
                keywords: c.keywords,
                content: c.content?.substring(0, 100),
                depth: c.depth
            })),
            related: outgoingLinks.map(l => ({
                node_id: l.toNodeId,
                link_type: l.linkType,
                weight: l.weight,
                node: nodeMap.has(l.toNodeId) ? {
                    type: nodeMap.get(l.toNodeId).type,
                    keywords: nodeMap.get(l.toNodeId).keywords,
                    content: nodeMap.get(l.toNodeId).content?.substring(0, 100)
                } : null
            }))
        };
    }

    /**
     * Ottiene breadcrumbs per un nodo (percorso radice -> nodo)
     * @param {string} projectId
     * @param {string} nodeId
     * @returns {Array}
     */
    async getBreadcrumbs(projectId, nodeId) {
        const {Node} = await this.getModels(projectId);
        const breadcrumbs = [];
        let currentId = nodeId;
        const visited = new Set();

        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const node = await Node.findByPk(currentId);
            if (!node) break;

            breadcrumbs.unshift({
                id: node.id,
                type: node.type,
                keywords: node.keywords
            });

            currentId = node.parentId;
        }

        return breadcrumbs;
    }

    /**
     * Collega due nodi
     * @param {Object} params
     * @returns {Object}
     */
    async linkNodes({projectId, fromNodeId, toNodeId, linkType = 'related', weight = 1.0}) {
        const {Link} = await this.getModels(projectId);
        if (!Link) {
            throw new Error('Link model not available');
        }

        const [link, created] = await Link.findOrCreate({
            where: {fromNodeId, toNodeId},
            defaults: {linkType, weight}
        });

        if (!created) {
            await link.update({linkType, weight});
        }

        return {
            link_id: link.id,
            link_type: link.linkType,
            weight: link.weight,
            created: !created
        };
    }

    /**
     * Aggiorna un nodo
     * @param {Object} params
     * @returns {Object}
     */
    async updateNode({projectId, nodeId, keywords, content, metadata, weight}) {
        const {Node} = await this.getModels(projectId);

        const node = await Node.findByPk(nodeId);
        if (!node) {
            throw new Error('Node not found');
        }

        const updates = {};
        if (keywords !== undefined) {
            updates.keywords = keywords;
            updates.keywordCount = keywords.length;
        }
        if (content !== undefined) updates.content = content;
        if (metadata !== undefined) updates.metadata = metadata;
        if (weight !== undefined) updates.weight = weight;

        await node.update(updates);

        return {
            node_id: node.id,
            updated: true
        };
    }

    /**
     * Elimina un nodo (con cascade opzionale)
     * @param {Object} params
     */
    async deleteNode({projectId, nodeId, cascade = false}) {
        const {Node, Link} = await this.getModels(projectId);

        if (cascade) {
            // Elimina figli ricorsivamente
            await this.deleteChildren(projectId, nodeId);
        } else {
            // Sposta figli al parent del nodo eliminato
            const node = await Node.findByPk(nodeId);
            if (node) {
                await Node.update(
                    {parentId: node.parentId},
                    {where: {parentId: nodeId}}
                );
            }
        }

        // Elimina link
        await Link.destroy({
            where: {fromNodeId: nodeId}
        });
        await Link.destroy({
            where: {toNodeId: nodeId}
        });

        // Elimina nodo
        await Node.destroy({where: {id: nodeId}});

        return {deleted: true, nodeId};
    }

    /**
     * Elimina figli ricorsivamente
     * @param {string} projectId
     * @param {string} parentId
     */
    async deleteChildren(projectId, parentId) {
        const {Node} = await this.getModels(projectId);
        const children = await Node.findAll({where: {parentId}});

        for (const child of children) {
            await this.deleteChildren(projectId, child.id);
            await child.destroy();
        }
    }

    /**
     * Ottiene statistiche progetto
     * @param {string} projectId
     * @returns {Object}
     */
    async getProjectStats(projectId) {
        // Assicura che il master DB sia pronto
        await this.ensureMasterDb();

        // Per le statistiche usiamo il master DB
        const masterModels = await this.getModels('master');
        const projectModels = await this.getModels(projectId);

        const project = await masterModels.Project.findByPk(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const nodeCount = await projectModels.Node.count({where: {projectId}});
        const linkCount = await projectModels.Link.count();

        // Raggruppa per tipo - approccio semplice
        const allNodes = await projectModels.Node.findAll({where: {projectId}});
        const types = {};
        for (const node of allNodes) {
            types[node.type] = (types[node.type] || 0) + 1;
        }

        // Ultimo nodo creato
        const lastNode = await projectModels.Node.findOne({
            where: {projectId},
            order: [['created_at', 'DESC']]
        });

        return {
            project_id: projectId,
            project_name: project.name,
            total_nodes: nodeCount,
            total_links: linkCount,
            types: types,
            last_activity: lastNode?.created_at || project.created_at
        };
    }

    /**
     * Aggiorna statistiche progetto
     * @param {string} projectId
     */
    async updateProjectStats(projectId) {
        // Trova il projectId dal master DB
        await this.ensureMasterDb();
        const {Project} = await this.getModels('master');
        const {Node} = await this.getModels(projectId);

        const count = await Node.count({where: {projectId}});

        await Project.update(
            {
                stats: {
                    totalNodes: count,
                    lastActivity: new Date()
                }
            },
            {where: {id: projectId}}
        );
    }

    /**
     * Suggerisce nodi basati su contesto
     * @param {Object} params
     * @returns {Array}
     */
    async suggestNodes({projectId, currentKeywords = [], maxResults = 5}) {
        const {Node} = await this.getModels(projectId);

        // Cerca nodi che condividono keywords
        // Cerca nodi che condividono keywords
        const results = await this.searchNodes({
            projectId,
            keywords: currentKeywords,
            maxResults: maxResults * 2,
            minConfidence: 0.2
        });

        // Filtra e restituisci suggerimenti
        return results.slice(0, maxResults).map(r => ({
            node_id: r.node_id,
            type: r.type,
            keywords: r.keywords,
            reason: `Condivide ${r.keywords.filter(k =>
                currentKeywords.some(ck => ck.toLowerCase() === k.toLowerCase())
            ).length} keyword(s)`,
            confidence: r.confidence
        }));
    }
}

export default new MemoryService();
