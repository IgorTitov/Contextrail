/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Graph Store port contract for the knowledge-graph module.
 * @sidecar graph-store-port.mjs.header.md
 * @layer module | @hex port | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * Port contract for graph store adapters.
 * SpecRefs: TPL-115; TPL-182
 */

/**
 * Entity shape produced by entity extractors and consumed by the graph
 * store. Mirrors modules/knowledge-graph/types.d.ts. Recovered from
 * modules/knowledge-graph/adapters/memory-graph-adapter.mjs (TPL-182).
 *
 * @typedef {object} Entity
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {object} [metadata]
 */

/**
 * Relationship shape produced by relationship extractors and consumed by
 * the graph store. Mirrors modules/knowledge-graph/types.d.ts. Recovered
 * from modules/knowledge-graph/adapters/memory-graph-adapter.mjs (TPL-182).
 *
 * @typedef {object} Relationship
 * @property {string} source
 * @property {string} target
 * @property {string} type
 * @property {number} [weight]
 * @property {object} [metadata]
 */

/**
 * Port contract for graph store adapters. Recovered from
 * modules/knowledge-graph/adapters/memory-graph-adapter.mjs which
 * implements all 7 methods against an in-memory map + array store.
 * Mirrors modules/knowledge-graph/types.d.ts `GraphStorePort` (TPL-182).
 *
 * @typedef {object} GraphStorePort
 * @property {(entities: Entity[]) => void} addEntities
 * @property {(relationships: Relationship[]) => void} addRelationships
 * @property {() => Entity[]} getEntities
 * @property {() => Relationship[]} getRelationships
 * @property {(entityId: string) => Entity[]} getNeighbors
 * @property {(startId: string, maxDepth: number) => Entity[]} traverse
 * @property {() => void} clear
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = [
  'addEntities',
  'addRelationships',
  'getEntities',
  'getRelationships',
  'getNeighbors',
  'traverse',
  'clear',
];

/** @param {unknown} adapter @throws {TypeError} */
export function assertGraphStorePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('knowledge-graph.error.graph_store_port_not_object'));
  }
  const a = /** @type {Record<string,unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('knowledge-graph.error.graph_store_port_missing_method', { method }));
    }
  }
}
