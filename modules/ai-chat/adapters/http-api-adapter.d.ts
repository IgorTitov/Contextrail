/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Http Api Adapter.D adapter for the ai-chat module.
 * @sidecar http-api-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the HTTP API adapter.
 *
 * SpecRefs: TPL-074
 */

import type { AiChatPort, AiChatOptions } from '../types.js';

/**
 * Minimal ApiClientPort shape used by the adapter.
 * Inlined to avoid cross-module relative import.
 */
interface ApiClientPortLike {
  get(url: string, options?: any): Promise<any>;
  post(url: string, body?: any, options?: any): Promise<any>;
  put(url: string, body?: any, options?: any): Promise<any>;
  delete(url: string, options?: any): Promise<any>;
  setBaseUrl(url: string): void;
  setHeader(name: string, value: string): void;
  removeHeader(name: string): void;
}

export interface HttpApiAdapterConfig {
  apiClient: ApiClientPortLike;
  endpoint: string;
  model?: string;
  formatRequest?: (
    messages: Array<{ role: string; content: string }>,
    options?: AiChatOptions,
    model?: string,
  ) => object;
  formatResponse?: (data: any) => {
    content: string;
    usage: any;
    model: string | null;
  };
  maxMessages?: number;
}

export function createHttpApiAdapter(config: HttpApiAdapterConfig): AiChatPort;
