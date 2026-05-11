/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Api Client Port.D port for the api-client module.
 * @sidecar api-client-port.d.ts.header.md
 * @layer module | @hex port | @ctx api-client
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the API client port.
 *
 * SpecRefs: TPL-068
 */

export interface ApiResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  ok: boolean;
}

export interface ApiError extends ApiResponse {
  /** i18n message key */
  message: string;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  timeout?: number;
}

export interface ApiClientPort {
  get(url: string, options?: ApiRequestOptions): Promise<ApiResponse>;
  post(url: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse>;
  put(url: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponse>;
  delete(url: string, options?: ApiRequestOptions): Promise<ApiResponse>;
  setBaseUrl(url: string): void;
  setHeader(name: string, value: string): void;
  removeHeader(name: string): void;
}

export function assertApiClientPort(adapter: unknown): asserts adapter is ApiClientPort;
