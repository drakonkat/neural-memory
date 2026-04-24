/**
 * Memory Service v2.0
 * Logica di business per la gestione della memoria neurale unificata
 * 
 * CAMBIAMENTI v2.0:
 * - DB unificato (nessun projectId)
 * - Session management
 * - Skills con schema rigido
 * - Context compression
 */

import { v4 as uuidv4 } from 'uuid';
import { getConnection, initDataDir } from '../database/connection.js';
import { initModels } from '../database/models/index.js';
import { runMigrations } from '../database/migrator.js';

class MemoryService {
    constructor() {
        // Cache del modello (unico DB)
        this.modelsCache = null;
        this.initialized = false;
        // Sessione attiva corrente
        this.activeSessionId = null;
    }

    /**
     * Helper: парсит keywords (могут быть array или JSON string)
     */
    parseKeywords(keywords) {
        if (!keywords) return [];
        if (Array.isArray(keywords)) return keywords;
        try {
            return JSON.parse(keywords);
        } catch {
            return [];
        }
    }

    /**
     * Inizializza il servizio (una volta sola)
     */
    async ensureInitialized() {
        if (!this.initialized) {
            initDataDir();
            const sequelize = getConnection();
            this.modelsCache = initModels(sequelize);
            await runMigrations(sequelize);
            this.initialized = true;
        }
    }

    /**
     * Ottiene i modelli (sempre dalla stessa cache)
     * @returns {Object} - { Session, Node, Link }
     */
    async getModels() {
        await this.ensureInitialized();
        return this.modelsCache;
    }

    /**
     * Imposta la sessione attiva
     * @param {string|null} sessionId
     */
    setActiveSession(sessionId) {
        this.activeSessionId = sessionId;
    }

    /**
     * Ottiene la sessione attiva corrente
     * @returns {string|null}
     */
    getActiveSession() {
        return this.activeSessionId;
    }

    // ==================== SESSION MANAGEMENT ====================

    /**
     * Inizia una nuova sessione di lavoro
     * @param {Object} params
     * @returns {Object} - { session_id, name, started_at, success }
     */
    async startSession({
        name,
        description = '',
        tags = [],
        projectPath = null,
        initialContext = {}
    }) {
        await this.ensureInitialized();
        const { Session } = await this.getModels();

        // Chiudi sessioni attive precedenti
        await Session.update(
            { isActive: false, endedAt: new Date() },
            { where: { isActive: true } }
        );

        // Crea nuova sessione
        const session = await Session.create({
            name,
            description,
            tags,
            projectPath,
            context: initialContext,
            isActive: true,
            stats: {
                nodesCreated: 0,
                skillsRegistered: 0,
                skillsUsed: 0,
                durationMinutes: 0
            }
        });

        this.activeSessionId = session.id;

        return {
            session_id: session.id,
            name: session.name,
            description: session.description,
            tags: session.tags,
            started_at: session.startedAt,
            is_active: session.isActive,
            success: true
        };
    }

    /**
     * Riprende una sessione esistente
     * @param {string} sessionId
     * @returns {Object}
     */
    async resumeSession(sessionId) {
        await this.ensureInitialized();
        const { Session, Node } = await this.getModels();

        const session = await Session.findByPk(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Chiudi altre sessioni attive
        await Session.update(
            { isActive: false, endedAt: new Date() },
            { where: { isActive: true } }
        );

        // Riattiva questa sessione
        await session.update({ isActive: true, endedAt: null });

        // Conta nodi creati
        const nodeCount = await Node.count({ where: { sessionId } });

        // Recupera ultimi nodi
        const recentNodes = await Node.findAll({
            where: { sessionId },
            order: [['created_at', 'DESC']],
            limit: 10
        });

        this.activeSessionId = session.id;

        return {
            session_id: session.id,
            name: session.name,
            description: session.description,
            tags: session.tags,
            started_at: session.startedAt,
            ended_at: session.endedAt,
            is_active: session.isActive,
            context: session.context,
            nodes_created: nodeCount,
            recent_nodes: recentNodes.map(n => ({
                id: n.id,
                type: n.type,
                keywords: n.keywords,
                content_preview: n.content?.substring(0, 100)
            })),
            success: true
        };
    }

    /**
     * Chiude la sessione attuale
     * @param {string} sessionId
     * @returns {Object}
     */
    async endSession(sessionId) {
        await this.ensureInitialized();
        const { Session, Node } = await this.getModels();

        const session = await Session.findByPk(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Calcola statistiche finali
        const nodeCount = await Node.count({ where: { sessionId } });
        const skillsCount = await Node.count({ 
            where: { sessionId, type: 'skill' } 
        });

        // Calcola durata
        const startTime = new Date(session.startedAt).getTime();
        const endTime = Date.now();
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        // Aggiorna sessione
        await session.update({
            isActive: false,
            endedAt: new Date(),
            stats: {
                nodesCreated: nodeCount,
                skillsRegistered: skillsCount,
                skillsUsed: session.stats?.skillsUsed || 0,
                durationMinutes
            }
        });

        if (this.activeSessionId === sessionId) {
            this.activeSessionId = null;
        }

        return {
            session_id: session.id,
            name: session.name,
            stats: {
                nodes_created: nodeCount,
                skills_registered: skillsCount,
                skills_used: session.stats?.skillsUsed || 0,
                duration_minutes: durationMinutes
            },
            ended_at: session.endedAt,
            success: true
        };
    }

    /**
     * Lista sessioni con filtri
     * @param {Object} params
     * @returns {Array}
     */
    async listSessions(params = {}) {
        const {
            limit = 20,
            includeEnded = false,
            tags = [],
            projectPath = null
        } = params;
        await this.ensureInitialized();
        const { Session } = await this.getModels();

        const where = {};
        
        if (!includeEnded) {
            where.isActive = true;
        }
        
        if (projectPath) {
            where.projectPath = projectPath;
        }

        const sessions = await Session.findAll({
            where,
            order: [['started_at', 'DESC']],
            limit
        });

        // Filtra per tag se specificati
        let results = sessions;
        if (tags.length > 0) {
            results = sessions.filter(s => {
                const sessionTags = Array.isArray(s.tags) ? s.tags : [];
                return tags.some(t => sessionTags.includes(t));
            });
        }

        return results.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            tags: s.tags,
            started_at: s.startedAt,
            ended_at: s.endedAt,
            is_active: s.isActive,
            stats: s.stats
        }));
    }

    // ==================== NODE MANAGEMENT ====================

    /**
     * Aggiunge un nodo alla memoria
     * @param {Object} params
     * @returns {Object} - { node_id, confidence_score }
     */
    async addNode({
        sessionId = null,
        keywords = [],
        content = '',
        type = 'generic',
        parentId = null,
        metadata = {},
        weight = 1.0
    }) {
        const models = await this.getModels();
        const { Node, Session } = models;

        // Usa sessione attiva se non specificata
        const effectiveSessionId = sessionId || this.activeSessionId;

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
            sessionId: effectiveSessionId,
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
        await this.updateFTS5(node);

        // Aggiorna statistiche sessione se presente
        if (effectiveSessionId) {
            await this.updateSessionStats(effectiveSessionId, {
                increment: 'nodesCreated'
            });
        }

        return {
            node_id: node.id,
            type: node.type,
            depth: node.depth,
            session_id: node.sessionId,
            keywords_count: keywords.length,
            metadata: node.metadata,
            success: true
        };
    }

    /**
     * Aggiorna l'indice FTS5 per un nodo
     * @param {Object} node
     */
    async updateFTS5(node) {
        const sequelize = getConnection();

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
     * Aggiorna statistiche sessione
     * @param {string} sessionId
     * @param {Object} updates
     */
    async updateSessionStats(sessionId, updates) {
        const { Session, Node } = await this.getModels();
        
        const session = await Session.findByPk(sessionId);
        if (!session) return;

        // Gestisce sia plain object che Sequelize instance
        const sessionStats = session.stats;
        const stats = (sessionStats && typeof sessionStats === 'object') 
            ? { ...sessionStats } 
            : {};

        if (updates.increment === 'nodesCreated') {
            stats.nodesCreated = (stats.nodesCreated || 0) + 1;
        } else if (updates.increment === 'skillsRegistered') {
            stats.skillsRegistered = (stats.skillsRegistered || 0) + 1;
        } else if (updates.increment === 'skillsUsed') {
            stats.skillsUsed = (stats.skillsUsed || 0) + 1;
        }

        await session.update({ stats });
    }

    /**
     * Cerca nodi per keywords
     * @param {Object} params
     * @returns {Array} - Risultati con confidence score
     */
    async searchNodes({
        keywords = [],
        maxResults = 10,
        minConfidence = 0.1,
        type = null,
        sessionId = null,
        tags = []
    }) {
        const { Node } = await this.getModels();

        if (keywords.length === 0) {
            return [];
        }

        const searchQuery = keywords.join(' OR ');

        let ftsQuery = [];
        try {
            const results = await getConnection().query(`
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
            ftsQuery = [];
        }

        const ftsMap = new Map();
        for (const row of ftsQuery) {
            ftsMap.set(row.node_id, row.bm25_score);
        }

        const whereClause = {};
        if (type) {
            whereClause.type = type;
        }
        if (sessionId) {
            whereClause.sessionId = sessionId;
        }

        const nodes = await Node.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: maxResults * 3
        });

        const scoredNodes = nodes.map(node => {
            const confidence = this.calculateConfidence(node, keywords, ftsMap);
            const nodeKeywords = this.parseKeywords(node.keywords);
            return {
                node_id: node.id,
                type: node.type,
                keywords: nodeKeywords,
                content: node.content,
                depth: node.depth,
                session_id: node.sessionId,
                parent_id: node.parentId,
                confidence: Math.round(confidence * 100) / 100,
                created_at: node.created_at
            };
        });

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
     * @returns {number} - Confidence 0.0 - 1.0
     */
    calculateConfidence(node, searchKeywords, ftsMap) {
        let score = 0;

        // 1. BM25 score normalizzato (0-0.35)
        const bm25 = ftsMap.get(node.id) || 0;
        const normalizedBm25 = Math.max(0, Math.min(0.35, -bm25 / 10));

        // 2. Keyword match (0-0.25)
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
        const matchedKeywords = keywords.filter(k =>
            searchKeywords.some(sk =>
                k.toLowerCase().includes(sk.toLowerCase()) ||
                sk.toLowerCase().includes(k.toLowerCase())
            )
        ).length;
        const keywordScore = searchKeywords.length > 0
            ? (matchedKeywords / searchKeywords.length) * 0.25
            : 0;

        // 3. Recency bonus (0-0.10)
        const ageInDays = (Date.now() - new Date(node.created_at)) / (1000 * 60 * 60 * 24);
        const recencyScore = ageInDays < 1 ? 0.10 :
            ageInDays < 7 ? 0.08 :
                ageInDays < 30 ? 0.05 : 0;

        // 4. Type bonus rafforzato per categorie semantiche (0-0.15)
        const typeScores = {
            'error': 0.15,
            'skill': 0.15,        // Skills sono importanti!
            'operation': 0.14,
            'convention': 0.13,
            'edge_case': 0.12,
            'pattern': 0.11,
            'task': 0.10,
            'action': 0.09,
            'entity': 0.07,
            'file': 0.06,
            'concept': 0.06,
            'summary': 0.05,
            'generic': 0.04
        };
        const typeScore = typeScores[node.type] || 0.05;

        // 5. Weight manuale (0-0.15)
        const weightScore = Math.min(0.15, (node.weight || 1.0) * 0.03);

        return Math.min(1.0, normalizedBm25 + keywordScore + recencyScore + typeScore + weightScore);
    }

    /**
     * Ottiene contesto di un nodo
     * @param {Object} params
     * @returns {Object}
     */
    async getNodeContext({ nodeId, depth = 1 }) {
        const { Node, Link } = await this.getModels();

        const node = await Node.findByPk(nodeId);
        if (!node) {
            throw new Error('Node not found');
        }

        const breadcrumbs = await this.getBreadcrumbs(nodeId);
        const children = await Node.findAll({
            where: { parentId: nodeId },
            order: [['created_at', 'DESC']]
        });

        const outgoingLinks = await Link.findAll({
            where: { fromNodeId: nodeId }
        });

        const targetIds = outgoingLinks.map(l => l.toNodeId);
        const targetNodes = targetIds.length > 0
            ? await Node.findAll({ where: { id: targetIds } })
            : [];
        const nodeMap = new Map(targetNodes.map(n => [n.id, n]));

        let grandchildren = [];
        if (depth > 1 && children.length > 0) {
            const childIds = children.map(c => c.id);
            grandchildren = await Node.findAll({
                where: { parentId: childIds },
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
                session_id: node.sessionId,
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
     * Ottiene breadcrumbs per un nodo
     * @param {string} nodeId
     * @returns {Array}
     */
    async getBreadcrumbs(nodeId) {
        const { Node } = await this.getModels();
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
    async linkNodes({ fromNodeId, toNodeId, linkType = 'related', weight = 1.0 }) {
        const { Link } = await this.getModels();

        const [link, created] = await Link.findOrCreate({
            where: { fromNodeId, toNodeId },
            defaults: { linkType, weight }
        });

        if (!created) {
            await link.update({ linkType, weight });
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
    async updateNode({ nodeId, keywords, content, metadata, weight }) {
        const { Node } = await this.getModels();

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
     * Elimina un nodo
     * @param {Object} params
     */
    async deleteNode({ nodeId, cascade = false }) {
        const { Node, Link } = await this.getModels();

        if (cascade) {
            await this.deleteChildren(nodeId);
        } else {
            const node = await Node.findByPk(nodeId);
            if (node) {
                await Node.update(
                    { parentId: node.parentId },
                    { where: { parentId: nodeId } }
                );
            }
        }

        await Link.destroy({ where: { fromNodeId: nodeId } });
        await Link.destroy({ where: { toNodeId: nodeId } });
        await Node.destroy({ where: { id: nodeId } });

        return { deleted: true, nodeId };
    }

    async deleteChildren(parentId) {
        const { Node } = await this.getModels();
        const children = await Node.findAll({ where: { parentId } });

        for (const child of children) {
            await this.deleteChildren(child.id);
            await child.destroy();
        }
    }

    // ==================== SKILLS MANAGEMENT ====================

    /**
     * Registra una skill con schema rigido
     * @param {Object} params
     * @returns {Object}
     */
    async registerSkill({
        name,
        framework,
        language,
        filePattern,
        learnSteps = [],
        useCases = [],
        implementation = '',
        examples = [],
        prerequisites = [],
        keywords = [],
        content = ''
    }) {
        const { Node } = await this.getModels();

        // Costruisci il contenuto strutturato
        const structuredContent = content || `SKILL: ${name}\n\n` +
            `FRAMEWORK: ${framework}\n` +
            `LANGUAGE: ${language}\n` +
            `FILE PATTERN: ${filePattern}\n\n` +
            `LEARN STEPS:\n${learnSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
            `USE CASES:\n${useCases.map(u => `- ${u}`).join('\n')}\n\n` +
            (implementation ? `IMPLEMENTATION:\n${implementation}` : '');

        // Costruisci keywords combinate
        const allKeywords = [
            name.toLowerCase(),
            framework.toLowerCase(),
            language.toLowerCase(),
            ...filePattern.toLowerCase().split(/[\/\-\.]/).filter(Boolean),
            ...keywords
        ];

        // Metadati strutturati per la skill
        const metadata = {
            framework,
            language,
            filePattern,
            learnSteps,
            useCases,
            implementation,
            examples,
            prerequisites,
            confidence: 0.5,
            usageCount: 0
        };

        const sessionId = this.activeSessionId;

        const node = await Node.create({
            sessionId,
            type: 'skill',
            keywords: allKeywords,
            content: structuredContent,
            metadata,
            weight: 1.5,
            keywordCount: allKeywords.length
        });

        await this.updateFTS5(node);

        if (sessionId) {
            await this.updateSessionStats(sessionId, {
                increment: 'skillsRegistered'
            });
        }

        return {
            skill_id: node.id,
            name,
            framework,
            language,
            file_pattern: filePattern,
            learn_steps: learnSteps,
            use_cases: useCases,
            confidence: 0.5,
            success: true
        };
    }

    /**
     * Applica/suggerisci skill basata su keywords
     * @param {Object} params
     * @returns {Object}
     */
    async applySkill({ keywords = [], context = '', domain = null }) {
        // Cerca skills matching
        const results = await this.searchNodes({
            keywords,
            maxResults: 5,
            minConfidence: 0.3,
            type: 'skill'
        });

        if (results.length === 0) {
            return {
                matched: false,
                message: 'Nessuna skill trovata per le keywords specificate',
                suggestions: []
            };
        }

        // Filtra per domain se specificato
        let skills = results;
        if (domain) {
            skills = results.filter(r => {
                const meta = r.metadata || {};
                return meta.language?.toLowerCase() === domain.toLowerCase() ||
                       meta.framework?.toLowerCase().includes(domain.toLowerCase());
            });
        }

        // Recupera dettagli skill
        const { Node } = await this.getModels();
        const detailedSkills = await Promise.all(
            skills.slice(0, 3).map(async (r) => {
                const node = await Node.findByPk(r.node_id);
                return {
                    skill_id: node.id,
                    name: node.keywords?.[0] || node.content?.split('\n')[0],
                    keywords: node.keywords,
                    framework: node.metadata?.framework,
                    language: node.metadata?.language,
                    file_pattern: node.metadata?.filePattern,
                    learn_steps: node.metadata?.learnSteps || [],
                    implementation: node.metadata?.implementation,
                    confidence: r.confidence
                };
            })
        );

        const bestMatch = detailedSkills[0];

        // Incrementa usage count
        if (bestMatch) {
            const node = await Node.findByPk(bestMatch.skill_id);
            if (node) {
                const meta = node.metadata || {};
                await node.update({
                    metadata: {
                        ...meta,
                        usageCount: (meta.usageCount || 0) + 1,
                        lastUsedAt: new Date().toISOString()
                    }
                });
            }

            const sessionId = this.activeSessionId;
            if (sessionId) {
                await this.updateSessionStats(sessionId, {
                    increment: 'skillsUsed'
                });
            }
        }

        return {
            matched: true,
            skill_id: bestMatch?.skill_id,
            name: bestMatch?.name,
            framework: bestMatch?.framework,
            language: bestMatch?.language,
            file_pattern: bestMatch?.file_pattern,
            learn_steps: bestMatch?.learn_steps,
            implementation: bestMatch?.implementation,
            confidence: bestMatch?.confidence,
            all_matches: detailedSkills
        };
    }

    /**
     * Suggerisci skills basate su contesto
     * @param {Object} params
     * @returns {Array}
     */
    async suggestSkills({ currentKeywords = [], maxResults = 5, domain = null }) {
        const results = await this.searchNodes({
            keywords: currentKeywords,
            maxResults: maxResults * 2,
            minConfidence: 0.2,
            type: 'skill'
        });

        let skills = results;
        if (domain) {
            skills = results.filter(r => {
                const meta = r.metadata || {};
                return meta.language?.toLowerCase() === domain.toLowerCase() ||
                       meta.framework?.toLowerCase().includes(domain.toLowerCase());
            });
        }

        return skills.slice(0, maxResults).map(r => ({
            skill_id: r.node_id,
            type: r.type,
            keywords: r.keywords,
            framework: r.metadata?.framework,
            language: r.metadata?.language,
            confidence: r.confidence,
            reason: `Condivide ${r.keywords.filter(k =>
                currentKeywords.some(ck => ck.toLowerCase() === k.toLowerCase())
            ).length} keyword(s)`
        }));
    }

    // ==================== CONTEXT MANAGEMENT ====================

    /**
     * Salva snapshot contesto dettagliato
     * @param {Object} params
     * @returns {Object}
     */
    async saveContextSnapshot({
        sessionId,
        summary = '',
        workDone = {},
        pendingTasks = [],
        keyDecisions = [],
        blockers = [],
        learnings = [],
        nextSteps = []
    }) {
        const { Node } = await this.getModels();
        
        const effectiveSessionId = sessionId || this.activeSessionId;
        if (!effectiveSessionId) {
            throw new Error('Nessuna sessione attiva');
        }

        const content = JSON.stringify({
            summary,
            workDone,
            pendingTasks,
            keyDecisions,
            blockers,
            learnings,
            nextSteps,
            savedAt: new Date().toISOString()
        }, null, 2);

        const node = await Node.create({
            sessionId: effectiveSessionId,
            type: 'context_snapshot',
            keywords: ['context-snapshot', 'summary', effectiveSessionId],
            content,
            metadata: {
                summary,
                pendingTasksCount: pendingTasks.length,
                blockersCount: blockers.length,
                learningsCount: learnings.length
            },
            weight: 2.0
        });

        await this.updateFTS5(node);

        return {
            snapshot_id: node.id,
            session_id: effectiveSessionId,
            summary,
            pending_tasks_count: pendingTasks.length,
            success: true
        };
    }

    /**
     * Recupera contesto compresso
     * @param {string} snapshotId
     * @returns {Object}
     */
    async restoreContext(snapshotId) {
        const { Node } = await this.getModels();

        const node = await Node.findByPk(snapshotId);
        if (!node) {
            throw new Error('Snapshot not found');
        }

        try {
            const context = JSON.parse(node.content);
            return {
                snapshot_id: node.id,
                session_id: node.sessionId,
                ...context,
                success: true
            };
        } catch (e) {
            return {
                snapshot_id: node.id,
                session_id: node.sessionId,
                raw_content: node.content,
                success: false,
                error: 'Failed to parse context'
            };
        }
    }

    /**
     * Genera riassunto sessione
     * @param {string} sessionId
     * @returns {Object}
     */
    async generateSessionSummary(sessionId) {
        const { Session, Node } = await this.getModels();

        const session = await Session.findByPk(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const nodes = await Node.findAll({
            where: { sessionId },
            order: [['created_at', 'ASC']]
        });

        // Raggruppa per tipo
        const types = {};
        for (const node of nodes) {
            if (!types[node.type]) {
                types[node.type] = [];
            }
            types[node.type].push(node);
        }

        // Costruisci riassunto
        const summaries = [];
        summaries.push(`Sessione: ${session.name}`);
        summaries.push(`Durata: ${session.stats?.durationMinutes || 0} minuti`);
        summaries.push(`Nodi creati: ${nodes.length}`);
        
        if (types.task?.length) {
            summaries.push(`Tasks completati: ${types.task.length}`);
        }
        if (types.skill?.length) {
            summaries.push(`Skills apprese: ${types.skill.length}`);
        }
        if (types.error?.length) {
            summaries.push(`Errori risolti: ${types.error.length}`);
        }

        // Extract pending tasks
        const pendingTasks = nodes
            .filter(n => n.type === 'context_snapshot')
            .flatMap(n => {
                try {
                    const ctx = JSON.parse(n.content);
                    return ctx.pendingTasks || [];
                } catch {
                    return [];
                }
            });

        return {
            session_id: sessionId,
            name: session.name,
            summary: summaries.join('\n'),
            stats: session.stats,
            types_summary: Object.keys(types).map(t => ({
                type: t,
                count: types[t].length
            })),
            pending_tasks: pendingTasks,
            node_count: nodes.length
        };
    }

    // ==================== REPORTS ====================

    /**
     * Genera report memoria
     * @param {Object} params
     * @returns {Object}
     */
    async getMemoryReport({
        format = 'json',
        sessions = [],
        keywords = [],
        includeStats = true,
        includeRecentWork = true,
        includeTopSkills = true
    }) {
        const { Session, Node } = await this.getModels();

        const report = {};

        if (includeStats) {
            const totalNodes = await Node.count();
            const totalSessions = await Session.count();
            
            const byType = await Node.findAll({
                attributes: ['type'],
                group: ['type']
            });

            const typeStats = {};
            for (const t of byType) {
                typeStats[t.type] = await Node.count({ where: { type: t.type } });
            }

            report.stats = {
                total_nodes: totalNodes,
                total_sessions: totalSessions,
                by_type: typeStats
            };
        }

        if (includeTopSkills) {
            const skills = await this.searchNodes({
                keywords: keywords.length > 0 ? keywords : ['skill'],
                maxResults: 10,
                minConfidence: 0.1,
                type: 'skill'
            });
            report.top_skills = skills.map(s => ({
                type: s.type,
                keywords: s.keywords,
                confidence: s.confidence,
                node_id: s.node_id
            }));
        }

        if (includeRecentWork) {
            const recentNodes = await Node.findAll({
                order: [['created_at', 'DESC']],
                limit: 20
            });
            report.recent_work = recentNodes.map(n => ({
                id: n.id,
                type: n.type,
                keywords: this.parseKeywords(n.keywords),
                session_id: n.sessionId,
                created_at: n.created_at
            }));
        }

        if (sessions.length > 0 || keywords.length > 0) {
            const searchResults = await this.searchNodes({
                keywords,
                maxResults: 50
            });
            report.search_results = searchResults;
        }

        if (format === 'html') {
            return this.generateHtmlReport(report);
        }

        return {
            report,
            generated_at: new Date().toISOString(),
            format
        };
    }

    /**
     * Genera report HTML
     * @param {Object} report
     * @returns {string}
     */
    generateHtmlReport(report) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Neural Memory Report</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; }
        .stat-value { font-size: 2em; font-weight: bold; color: #6366f1; }
        .stat-label { color: #666; margin-top: 5px; }
        .node-list { list-style: none; padding: 0; }
        .node-item { background: #fff; border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 6px; }
        .node-type { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .type-skill { background: #dbeafe; color: #1e40af; }
        .type-task { background: #dcfce7; color: #166534; }
        .type-error { background: #fee2e2; color: #991b1b; }
        .type-generic { background: #f3f4f6; color: #374151; }
        .keywords { margin-top: 8px; }
        .keyword-tag { display: inline-block; background: #e5e7eb; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 5px; }
        .timestamp { color: #888; font-size: 0.85em; }
    </style>
</head>
<body>
    <h1>🧠 Neural Memory Report</h1>
    <p class="timestamp">Generato il: ${new Date().toLocaleString()}</p>
    
    <h2>📊 Statistiche</h2>
    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${report.stats?.total_nodes || 0}</div>
            <div class="stat-label">Nodi Totali</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${report.stats?.total_sessions || 0}</div>
            <div class="stat-label">Sessioni</div>
        </div>
    </div>
    
    <h2>📈 Nodi per Tipo</h2>
    <div class="stats">
        ${Object.entries(report.stats?.by_type || {}).map(([type, count]) => `
            <div class="stat-card">
                <div class="stat-value">${count}</div>
                <div class="stat-label">${type}</div>
            </div>
        `).join('')}
    </div>
    
    <h2>🏆 Top Skills</h2>
    <ul class="node-list">
        ${(report.top_skills || []).map(s => `
            <li class="node-item">
                <span class="node-type type-${s.type}">${s.type}</span>
                <strong>${s.keywords && s.keywords[0] ? s.keywords[0] : 'Unknown'}</strong>
                <div class="keywords">
                    ${(s.keywords || []).slice(0, 5).map(k => `<span class="keyword-tag">${k}</span>`).join('')}
                </div>
                <div class="timestamp">Confidence: ${(s.confidence * 100).toFixed(0)}%</div>
            </li>
        `).join('')}
    </ul>
    
    <h2>📝 Lavoro Recente</h2>
    <ul class="node-list">
        ${(report.recent_work || []).map(n => `
            <li class="node-item">
                <span class="node-type type-${n.type}">${n.type}</span>
                <div class="keywords">
                    ${(n.keywords || []).slice(0, 5).map(k => `<span class="keyword-tag">${k}</span>`).join('')}
                </div>
                <div class="timestamp">${new Date(n.created_at).toLocaleString()}</div>
            </li>
        `).join('')}
    </ul>
</body>
</html>`;
    }

    /**
     * Suggerisce nodi rilevanti
     * @param {Object} params
     * @returns {Array}
     */
    async suggestNodes({ currentKeywords = [], maxResults = 5 }) {
        const results = await this.searchNodes({
            keywords: currentKeywords,
            maxResults: maxResults * 2,
            minConfidence: 0.2
        });

        return results.slice(0, maxResults).map(r => {
            const nodeKeywords = this.parseKeywords(r.keywords);
            return {
                node_id: r.node_id,
                type: r.type,
                keywords: nodeKeywords,
                reason: `Condivide ${nodeKeywords.filter(k =>
                    currentKeywords.some(ck => ck.toLowerCase() === k.toLowerCase())
                ).length} keyword(s)`,
                confidence: r.confidence
            };
        });
    }
}

export default new MemoryService();
