/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Fetch Adapter.D adapter for the api-client module.
 * @sidecar fetch-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx api-client
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the fetch adapter.
 *
 * SpecRefs: TPL-069
 */

import type { ApiClientPort } from '../ports/api-client-port.js';

export interface FetchAdapterOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export function createFetchAdapter(options?: FetchAdapterOptions): ApiClientPort;
