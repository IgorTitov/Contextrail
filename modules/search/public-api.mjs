/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single bounded entry point for the search module — re-exports port, domain, adapter, messages.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx search
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the search bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-001
 */

// Port
export { assertSearchPort } from './ports/search-port.mjs';

// Domain
export { createSearchDocument, documentText } from './domain/search-document.mjs';
export { tokenize, defaultStopWords } from './domain/tokenize.mjs';
export { highlightMatches } from './domain/highlight.mjs';

// Adapters
export { createMemorySearchAdapter } from './adapters/memory-search-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
