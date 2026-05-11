/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure builder that turns a route registry into an OpenAPI 3.0 document.
 * @sidecar build-document.mjs.header.md
 * @layer module | @hex domain | @ctx openapi
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * @typedef {object} OpenApiInfo
 * @property {string} title
 * @property {string} version
 * @property {string} [description]
 *
 * @typedef {object} OpenApiResponse
 * @property {string} description
 * @property {Record<string, unknown>} [content]
 *
 * @typedef {object} OpenApiParameter
 * @property {string} name
 * @property {'query' | 'path' | 'header'} in
 * @property {boolean} [required]
 * @property {string} [description]
 * @property {Record<string, unknown>} [schema]
 *
 * @typedef {object} RouteSpec
 * @property {string} method                       HTTP method (GET, POST, …)
 * @property {string} path                         URL path starting with `/`
 * @property {string} [summary]
 * @property {string} [description]
 * @property {string[]} [tags]
 * @property {OpenApiParameter[]} [parameters]
 * @property {Record<string, OpenApiResponse>} [responses]
 *
 * @typedef {object} BuilderInput
 * @property {OpenApiInfo} info
 * @property {RouteSpec[]} routes
 * @property {Array<{ url: string, description?: string }>} [servers]
 */

/**
 * Build a minimal OpenAPI 3.0.3 document from a route registry.
 *
 * Pure function — no I/O, no framework imports.
 * The output is a plain JS object that JSON.stringify produces a valid
 * OpenAPI 3.0 document for tools like Swagger UI, Redoc, or openapi-generator.
 *
 * @param {BuilderInput} input
 * @returns {Record<string, unknown>}
 */
export function buildOpenApiDocument(input) {
  if (!input || !input.info || !input.info.title || !input.info.version) {
    throw new TypeError(t('openapi.builder.missing_info'));
  }
  if (!Array.isArray(input.routes)) {
    throw new TypeError(t('openapi.builder.invalid_routes'));
  }

  /** @type {Record<string, Record<string, unknown>>} */
  const paths = {};

  for (const route of input.routes) {
    if (typeof route.method !== 'string' || route.method.length === 0) {
      throw new TypeError(t('openapi.builder.invalid_method', { method: String(route.method) }));
    }
    if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
      throw new TypeError(t('openapi.builder.invalid_path', { path: String(route.path) }));
    }

    const method = route.method.toLowerCase();
    if (!paths[route.path]) paths[route.path] = {};

    /** @type {Record<string, unknown>} */
    const operation = {
      summary: route.summary ?? `${route.method.toUpperCase()} ${route.path}`,
      responses: route.responses ?? {
        200: { description: 'Successful response' },
      },
    };
    if (route.description) operation.description = route.description;
    if (route.tags && route.tags.length > 0) operation.tags = route.tags;
    if (route.parameters && route.parameters.length > 0) operation.parameters = route.parameters;

    paths[route.path][method] = operation;
  }

  /** @type {Record<string, unknown>} */
  const document = {
    openapi: '3.0.3',
    info: {
      title: input.info.title,
      version: input.info.version,
      ...(input.info.description ? { description: input.info.description } : {}),
    },
    paths,
  };

  if (input.servers && input.servers.length > 0) {
    document.servers = input.servers;
  }

  return document;
}
