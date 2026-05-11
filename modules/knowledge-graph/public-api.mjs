/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the knowledge-graph bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx knowledge-graph
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the knowledge-graph bounded module.
 * SpecRefs: TPL-121
 */

// Ports
export { assertGraphStorePort } from './ports/graph-store-port.mjs';
export {
  assertEntityExtractorPort,
  assertRelationshipExtractorPort,
} from './ports/entity-extractor-port.mjs';

// Adapters
export { createMemoryGraphAdapter } from './adapters/memory-graph-adapter.mjs';
export { createRegexEntityExtractor } from './adapters/regex-entity-extractor.mjs';
export { createCooccurrenceRelationshipExtractor } from './adapters/cooccurrence-relationship-extractor.mjs';

// Domain algorithms
export { bfsTraverse, findConnectedComponents } from './domain/graph-algorithms.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
