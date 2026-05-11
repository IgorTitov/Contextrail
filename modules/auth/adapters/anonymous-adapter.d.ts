/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Anonymous Adapter.D adapter for the auth module.
 * @sidecar anonymous-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the anonymous adapter.
 *
 * SpecRefs: TPL-064
 */

import type { AuthPort } from '../ports/auth-port.js';

export function createAnonymousAdapter(): AuthPort;
