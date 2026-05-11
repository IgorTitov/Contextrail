/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Entity Extractor port contract for the knowledge-graph module.
 * @sidecar entity-extractor-port.mjs.header.md
 * @layer module | @hex port | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * Port contracts for entity and relationship extractors.
 * SpecRefs: TPL-117; TPL-118; TPL-181
 */

/**
 * Entity shape produced by entity extractors and consumed by relationship
 * extractors. Mirrors modules/knowledge-graph/types.d.ts. Recovered from
 * the regex-entity-extractor adapter (TPL-181).
 *
 * @typedef {object} Entity
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {object} [metadata]
 */

/**
 * Relationship shape produced by relationship extractors. Mirrors
 * modules/knowledge-graph/types.d.ts. Recovered from the
 * cooccurrence-relationship-extractor adapter (TPL-181).
 *
 * @typedef {object} Relationship
 * @property {string} source
 * @property {string} target
 * @property {string} type
 * @property {number} [weight]
 * @property {object} [metadata]
 */

/**
 * Port contract for entity extractors. Recovered from
 * modules/knowledge-graph/adapters/regex-entity-extractor.mjs which
 * implements `extractEntities(text) => Entity[]`.
 *
 * @typedef {object} EntityExtractorPort
 * @property {(text: string) => Entity[]} extractEntities
 */

/**
 * Port contract for relationship extractors. Recovered from
 * modules/knowledge-graph/adapters/cooccurrence-relationship-extractor.mjs
 * which implements `extractRelationships(text, entities) => Relationship[]`.
 *
 * @typedef {object} RelationshipExtractorPort
 * @property {(text: string, entities: Entity[]) => Relationship[]} extractRelationships
 */

import { t } from '../messages.mjs';

/** @param {unknown} adapter @throws {TypeError} */
export function assertEntityExtractorPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('knowledge-graph.error.entity_extractor_port_not_object'));
  }
  if (typeof (/** @type {any} */ (adapter).extractEntities) !== 'function') {
    throw new TypeError(t('knowledge-graph.error.entity_extractor_port_missing_method'));
  }
}

/** @param {unknown} adapter @throws {TypeError} */
export function assertRelationshipExtractorPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('knowledge-graph.error.relationship_extractor_port_not_object'));
  }
  if (typeof (/** @type {any} */ (adapter).extractRelationships) !== 'function') {
    throw new TypeError(t('knowledge-graph.error.relationship_extractor_port_missing_method'));
  }
}
