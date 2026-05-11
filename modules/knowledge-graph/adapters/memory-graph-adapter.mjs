/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory Graph adapter for the knowledge-graph module.
 * @sidecar memory-graph-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * In-memory graph store adapter with BFS traversal.
 * SpecRefs: TPL-116
 *
 * @typedef {import('../types.d.ts').Entity} Entity
 * @typedef {import('../types.d.ts').Relationship} Relationship
 * @typedef {import('../types.d.ts').GraphStorePort} GraphStorePort
 */

/**
 * @returns {GraphStorePort}
 */
export function createMemoryGraphAdapter() {
  /** @type {Map<string, Entity>} */
  const entities = new Map();
  /** @type {Relationship[]} */
  const relationships = [];

  return {
    addEntities(ents) {
      for (const e of ents) entities.set(e.id, { ...e });
    },

    addRelationships(rels) {
      for (const r of rels) relationships.push({ ...r });
    },

    getEntities() {
      return [...entities.values()];
    },

    getRelationships() {
      return [...relationships];
    },

    getNeighbors(entityId) {
      const neighborIds = new Set();
      for (const r of relationships) {
        if (r.source === entityId) neighborIds.add(r.target);
        if (r.target === entityId) neighborIds.add(r.source);
      }
      return [...neighborIds].map((id) => entities.get(id)).filter(Boolean);
    },

    traverse(startId, maxDepth) {
      const visited = new Set();
      /** @type {{ id: string, depth: number }[]} */
      const queue = [{ id: startId, depth: 0 }];
      visited.add(startId);

      while (queue.length > 0) {
        const { id, depth } = queue.shift();
        if (depth < maxDepth) {
          const neighborIds = new Set();
          for (const r of relationships) {
            if (r.source === id) neighborIds.add(r.target);
            if (r.target === id) neighborIds.add(r.source);
          }
          for (const nid of neighborIds) {
            if (!visited.has(nid)) {
              visited.add(nid);
              queue.push({ id: nid, depth: depth + 1 });
            }
          }
        }
      }

      return [...visited].map((id) => entities.get(id)).filter(Boolean);
    },

    clear() {
      entities.clear();
      relationships.length = 0;
    },
  };
}
