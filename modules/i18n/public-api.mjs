/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the i18n bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx i18n
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the i18n bounded module.
 * The only file other modules may import.
 */

// Domain
export { interpolate } from './domain/interpolation.mjs';
export { createPluralResolver, PLURAL_CATEGORIES } from './domain/pluralization.mjs';
export { createMessageRegistry } from './domain/message-registry.mjs';
export { buildFallbackChain, resolveWithFallback } from './domain/locale-resolver.mjs';

// Ports
export { assertI18nPort } from './ports/i18n-port.mjs';

// Adapters
export { createIntlAdapter } from './adapters/intl-adapter.mjs';
export { createMemoryI18nAdapter } from './adapters/memory-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
