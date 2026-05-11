/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the permission bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx permission
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the permission bounded module.
 * The only file other modules may import.
 */

// Ports
export { assertPermissionPort } from './ports/permission-port.mjs';

// Domain
export { createRoleHierarchy } from './domain/role-hierarchy.mjs';
export { matchRule } from './domain/rule-matcher.mjs';
export { checkAccess } from './domain/entitlement.mjs';

// Adapters
export { createStaticRulesAdapter } from './adapters/static-rules-adapter.mjs';
export { createDynamicPermissionAdapter } from './adapters/dynamic-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
