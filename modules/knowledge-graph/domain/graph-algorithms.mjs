/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Graph Algorithms domain logic for the knowledge-graph module.
 * @sidecar graph-algorithms.mjs.header.md
 * @layer module | @hex domain | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * Graph algorithms — BFS multi-hop traversal and connected components.
 * SpecRefs: TPL-119; TPL-120
 *
 * @typedef {import('../types.d.ts').Entity} Entity
 * @typedef {import('../types.d.ts').GraphStorePort} GraphStorePort
 */

/**
 * BFS multi-hop traversal from a start entity.
 *
 * @param {GraphStorePort} store
 * @param {string} startId
 * @param {number} maxDepth
 * @returns {Entity[]}
 */
export function bfsTraverse(store, startId, maxDepth) {
  return store.traverse(startId, maxDepth);
}

/**
 * Find connected components using Union-Find.
 *
 * @param {GraphStorePort} store
 * @returns {Entity[][]}
 */
export function findConnectedComponents(store) {
  const entities = store.getEntities();
  const relationships = store.getRelationships();

  if (entities.length === 0) return [];

  // Union-Find
  /** @type {Map<string, string>} */
  const parent = new Map();

  /** @param {string} id @returns {string} */
  function find(id) {
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)));
    }
    return parent.get(id);
  }

  /** @param {string} a @param {string} b */
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Initialize
  for (const e of entities) parent.set(e.id, e.id);

  // Union connected entities
  for (const r of relationships) {
    if (parent.has(r.source) && parent.has(r.target)) {
      union(r.source, r.target);
    }
  }

  // Group by root
  /** @type {Map<string, Entity[]>} */
  const groups = new Map();
  for (const e of entities) {
    const root = find(e.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(e);
  }

  return [...groups.values()];
}
