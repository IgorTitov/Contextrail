/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Generate the top-level capabilities block in modules/<name>/manifest.json from JSDoc @typedef, sibling types.d.ts, or JSDoc-with-imports sources; scope is cache, retrieval, knowledge-graph, notifications, and user-preferences (TPL-179..TPL-183).
 * @sidecar capabilities-sync.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { ensureWriteIfChanged, fileExists, parseArgs, readText, result } from './_shared.mjs';
import { parseJsdocTypedefs } from './lib/jsdoc-typedef-parser.mjs';
import { parseTypesDeclaration } from './lib/types-d-parser.mjs';
import { resolveImportTypedefs } from './lib/import-resolver.mjs';
import { ValidationError } from '../lib/errors.mjs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Public constants (also imported by tests/unit/capabilities-sync.test.mjs).
// ---------------------------------------------------------------------------

export const CACHE_PORT_FILE = 'modules/cache/ports/cache-port.mjs';
export const CACHE_MANIFEST_FILE = 'modules/cache/manifest.json';

export const RETRIEVAL_TYPES_FILE = 'modules/retrieval/types.d.ts';
export const RETRIEVAL_MANIFEST_FILE = 'modules/retrieval/manifest.json';

export const KG_ENTITY_EXTRACTOR_PORT_FILE =
  'modules/knowledge-graph/ports/entity-extractor-port.mjs';
export const KG_GRAPH_STORE_PORT_FILE = 'modules/knowledge-graph/ports/graph-store-port.mjs';
export const KG_MANIFEST_FILE = 'modules/knowledge-graph/manifest.json';

export const NOTIFICATIONS_PORT_FILE = 'modules/notifications/ports/notification-port.mjs';
export const NOTIFICATIONS_MANIFEST_FILE = 'modules/notifications/manifest.json';

export const USER_PREFERENCES_PORT_FILE = 'modules/user-preferences/ports/storage-port.mjs';
export const USER_PREFERENCES_MANIFEST_FILE = 'modules/user-preferences/manifest.json';

// A curated list of typedef names whose properties define the port surface.
// Extended via TPL-180+ (other modules, types.d.ts source).
const CACHE_PORT_TYPEDEFS = new Set(['CachePort']);

// The 7 retrieval ports documented in modules/retrieval/types.d.ts.
const RETRIEVAL_PORT_TYPEDEFS = new Set([
  'RetrievalPort',
  'ChunkerPort',
  'TokenizerPort',
  'EmbedderPort',
  'ReRankerPort',
  'DocumentLoaderPort',
  'QueryTransformerPort',
]);

// The 2 entity-extractor ports declared in
// modules/knowledge-graph/ports/entity-extractor-port.mjs (TPL-181).
const KG_ENTITY_EXTRACTOR_PORT_TYPEDEFS = new Set([
  'EntityExtractorPort',
  'RelationshipExtractorPort',
]);

// The graph-store port declared in
// modules/knowledge-graph/ports/graph-store-port.mjs (TPL-182).
const KG_GRAPH_STORE_PORT_TYPEDEFS = new Set(['GraphStorePort']);

// PARTIAL ports resolved by following same-module imports (TPL-183).
const NOTIFICATIONS_PORT_TYPEDEFS = new Set(['NotificationPort']);
const USER_PREFERENCES_PORT_TYPEDEFS = new Set(['StoragePort']);

// TPL-184: remaining JSDoc-sourced modules wired in small batches so parser
// surprises stay isolated. Path constants + port-typedef sets below.
export const AI_CHAT_PORT_FILE = 'modules/ai-chat/ports/ai-chat-port.mjs';
export const AI_CHAT_MANIFEST_FILE = 'modules/ai-chat/manifest.json';
export const ANALYTICS_PORT_FILE = 'modules/analytics/ports/analytics-port.mjs';
export const ANALYTICS_MANIFEST_FILE = 'modules/analytics/manifest.json';
export const API_CLIENT_PORT_FILE = 'modules/api-client/ports/api-client-port.mjs';
export const API_CLIENT_MANIFEST_FILE = 'modules/api-client/manifest.json';
export const AUTH_PORT_FILE = 'modules/auth/ports/auth-port.mjs';
export const AUTH_OAUTH_PORT_FILE = 'modules/auth/ports/oauth-provider-port.mjs';
export const AUTH_MANIFEST_FILE = 'modules/auth/manifest.json';
export const DB_PORT_FILE = 'modules/db/ports/database-port.mjs';
export const DB_MANIFEST_FILE = 'modules/db/manifest.json';
export const EVENT_BUS_PORT_FILE = 'modules/event-bus/ports/event-bus-port.mjs';
export const EVENT_BUS_MANIFEST_FILE = 'modules/event-bus/manifest.json';
export const EXAMPLE_GREETER_PORT_FILE = 'modules/example-greeter/ports/greeting-port.mjs';
export const EXAMPLE_GREETER_MANIFEST_FILE = 'modules/example-greeter/manifest.json';
export const FEATURE_SEAMS_PORT_FILE = 'modules/feature-seams/ports/seam-port.mjs';
export const FEATURE_SEAMS_MANIFEST_FILE = 'modules/feature-seams/manifest.json';
export const FILE_PORT_FILE = 'modules/file/ports/file-port.mjs';
export const FILE_MANIFEST_FILE = 'modules/file/manifest.json';
export const I18N_PORT_FILE = 'modules/i18n/ports/i18n-port.mjs';
export const I18N_MANIFEST_FILE = 'modules/i18n/manifest.json';
export const LOCAL_LLM_PORT_FILE = 'modules/local-llm/ports/local-llm-port.mjs';
export const LOCAL_LLM_MANIFEST_FILE = 'modules/local-llm/manifest.json';
export const LOG_PORT_FILE = 'modules/log/ports/log-port.mjs';
export const LOG_MANIFEST_FILE = 'modules/log/manifest.json';
export const ONBOARDING_PORT_FILE = 'modules/onboarding/ports/onboarding-port.mjs';
export const ONBOARDING_MANIFEST_FILE = 'modules/onboarding/manifest.json';
export const PERMISSION_PORT_FILE = 'modules/permission/ports/permission-port.mjs';
export const PERMISSION_MANIFEST_FILE = 'modules/permission/manifest.json';
export const REALTIME_PORT_FILE = 'modules/realtime/ports/realtime-port.mjs';
export const REALTIME_TRANSPORT_PORT_FILE = 'modules/realtime/ports/transport-port.mjs';
export const REALTIME_MANIFEST_FILE = 'modules/realtime/manifest.json';
export const SCHEDULER_PORT_FILE = 'modules/scheduler/ports/scheduler-port.mjs';
export const SCHEDULER_MANIFEST_FILE = 'modules/scheduler/manifest.json';
export const STATE_PORT_FILE = 'modules/state/ports/state-port.mjs';
export const STATE_MANIFEST_FILE = 'modules/state/manifest.json';
export const TASK_PORT_FILE = 'modules/task/ports/task-port.mjs';
export const TASK_MANIFEST_FILE = 'modules/task/manifest.json';
export const OPENAPI_PORT_FILE = 'modules/openapi/ports/openapi-document-port.mjs';
export const OPENAPI_MANIFEST_FILE = 'modules/openapi/manifest.json';
export const RATE_LIMIT_PORT_FILE = 'modules/rate-limit/ports/rate-limit-port.mjs';
export const RATE_LIMIT_MANIFEST_FILE = 'modules/rate-limit/manifest.json';
export const MONITORING_PORT_FILE = 'modules/monitoring/ports/monitoring-port.mjs';
export const MONITORING_MANIFEST_FILE = 'modules/monitoring/manifest.json';
export const JOB_QUEUE_PORT_FILE = 'modules/job-queue/ports/job-queue-port.mjs';
export const JOB_QUEUE_MANIFEST_FILE = 'modules/job-queue/manifest.json';
export const EMAIL_PORT_FILE = 'modules/email/ports/email-port.mjs';
export const EMAIL_MANIFEST_FILE = 'modules/email/manifest.json';
export const SEARCH_PORT_FILE = 'modules/search/ports/search-port.mjs';
export const SEARCH_MANIFEST_FILE = 'modules/search/manifest.json';
export const PAYMENTS_PORT_FILE = 'modules/payments/ports/payments-port.mjs';
export const PAYMENTS_MANIFEST_FILE = 'modules/payments/manifest.json';
export const TENANCY_PORT_FILE = 'modules/tenancy/ports/tenant-store-port.mjs';
export const TENANCY_MANIFEST_FILE = 'modules/tenancy/manifest.json';
export const CQRS_COMMAND_BUS_PORT_FILE = 'modules/cqrs/ports/command-bus-port.mjs';
export const CQRS_QUERY_BUS_PORT_FILE = 'modules/cqrs/ports/query-bus-port.mjs';
export const CQRS_EVENT_STORE_PORT_FILE = 'modules/cqrs/ports/event-store-port.mjs';
export const CQRS_MANIFEST_FILE = 'modules/cqrs/manifest.json';
export const PWA_PORT_FILE = 'modules/pwa/ports/pwa-asset-port.mjs';
export const PWA_MANIFEST_FILE = 'modules/pwa/manifest.json';
export const SEO_PORT_FILE = 'modules/seo/ports/seo-publisher-port.mjs';
export const SEO_MANIFEST_FILE = 'modules/seo/manifest.json';
export const THEME_PORT_FILE = 'modules/theme/ports/theme-preference-store-port.mjs';
export const THEME_MANIFEST_FILE = 'modules/theme/manifest.json';
export const GRAPHQL_PORT_FILE = 'modules/graphql/ports/graphql-transport-port.mjs';
export const GRAPHQL_MANIFEST_FILE = 'modules/graphql/manifest.json';
export const PRERENDER_RENDER_FUNCTION_PORT_FILE =
  'modules/prerender/ports/render-function-port.mjs';
export const PRERENDER_STATIC_OUTPUT_PORT_FILE = 'modules/prerender/ports/static-output-port.mjs';
export const PRERENDER_MANIFEST_FILE = 'modules/prerender/manifest.json';

// Module wiring table. Each entry maps one manifest to a list of capability
// `sources`. A source describes one port file (or types.d.ts) plus the
// parser to apply and the set of typedef names that should land in
// `capabilities.ports` (the rest become supporting `capabilities.typedefs`).
//
// Single-source modules (cache, retrieval) use a list of length 1. The
// knowledge-graph module uses two sources (entity-extractor + graph-store)
// because two distinct port files feed one manifest. The CLI loop merges
// the per-source `ports` and `typedefs` blocks into one capabilities block,
// erroring out on duplicate port names. TPL-184 will extend this table to
// the remaining modules.
const MODULE_TARGETS = [
  {
    key: 'cache',
    manifestFile: CACHE_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: CACHE_PORT_FILE,
        portTypedefs: CACHE_PORT_TYPEDEFS,
      },
    ],
  },
  {
    key: 'retrieval',
    manifestFile: RETRIEVAL_MANIFEST_FILE,
    sources: [
      {
        source: 'types-d',
        sourceFile: RETRIEVAL_TYPES_FILE,
        portTypedefs: RETRIEVAL_PORT_TYPEDEFS,
      },
    ],
  },
  {
    key: 'knowledge-graph',
    manifestFile: KG_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: KG_ENTITY_EXTRACTOR_PORT_FILE,
        portTypedefs: KG_ENTITY_EXTRACTOR_PORT_TYPEDEFS,
      },
      {
        source: 'jsdoc',
        sourceFile: KG_GRAPH_STORE_PORT_FILE,
        portTypedefs: KG_GRAPH_STORE_PORT_TYPEDEFS,
      },
    ],
  },
  // TPL-183 — PARTIAL ports resolved via same-module import-following.
  // The `jsdoc-with-imports` source tells the CLI loop to feed parsed
  // typedefs through `resolveImportTypedefs` before building the
  // capabilities block. Cross-module imports raise a hard error from the
  // resolver so a future port author who tries to reach across boundaries
  // gets a clear, file-anchored failure instead of a silent inline copy.
  {
    key: 'notifications',
    manifestFile: NOTIFICATIONS_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc-with-imports',
        sourceFile: NOTIFICATIONS_PORT_FILE,
        moduleRoot: 'modules/notifications',
        portTypedefs: NOTIFICATIONS_PORT_TYPEDEFS,
      },
    ],
  },
  {
    key: 'user-preferences',
    manifestFile: USER_PREFERENCES_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc-with-imports',
        sourceFile: USER_PREFERENCES_PORT_FILE,
        moduleRoot: 'modules/user-preferences',
        portTypedefs: USER_PREFERENCES_PORT_TYPEDEFS,
      },
    ],
  },
  // TPL-184: remaining 19 READY modules. Each entry wires one JSDoc-sourced
  // port file to its manifest. Parser extensions surfaced during wiring:
  // - `@typedef {Object}` (capital O) accepted alongside `{object}`
  // - rest params (`...args: any[]`) accepted in arrow signatures
  {
    key: 'example-greeter',
    manifestFile: EXAMPLE_GREETER_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: EXAMPLE_GREETER_PORT_FILE,
        portTypedefs: new Set(['GreetingPort']),
      },
    ],
  },
  {
    key: 'log',
    manifestFile: LOG_MANIFEST_FILE,
    sources: [{ source: 'jsdoc', sourceFile: LOG_PORT_FILE, portTypedefs: new Set(['LogPort']) }],
  },
  {
    key: 'state',
    manifestFile: STATE_MANIFEST_FILE,
    sources: [
      { source: 'jsdoc', sourceFile: STATE_PORT_FILE, portTypedefs: new Set(['StatePort']) },
    ],
  },
  {
    key: 'db',
    manifestFile: DB_MANIFEST_FILE,
    sources: [
      { source: 'jsdoc', sourceFile: DB_PORT_FILE, portTypedefs: new Set(['DatabasePort']) },
    ],
  },
  {
    key: 'event-bus',
    manifestFile: EVENT_BUS_MANIFEST_FILE,
    sources: [
      { source: 'jsdoc', sourceFile: EVENT_BUS_PORT_FILE, portTypedefs: new Set(['EventBusPort']) },
    ],
  },
  {
    key: 'i18n',
    manifestFile: I18N_MANIFEST_FILE,
    sources: [{ source: 'jsdoc', sourceFile: I18N_PORT_FILE, portTypedefs: new Set(['I18nPort']) }],
  },
  {
    key: 'file',
    manifestFile: FILE_MANIFEST_FILE,
    sources: [{ source: 'jsdoc', sourceFile: FILE_PORT_FILE, portTypedefs: new Set(['FilePort']) }],
  },
  {
    key: 'analytics',
    manifestFile: ANALYTICS_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: ANALYTICS_PORT_FILE,
        portTypedefs: new Set(['AnalyticsPort']),
      },
    ],
  },
  {
    key: 'task',
    manifestFile: TASK_MANIFEST_FILE,
    sources: [{ source: 'jsdoc', sourceFile: TASK_PORT_FILE, portTypedefs: new Set(['TaskPort']) }],
  },
  {
    key: 'openapi',
    manifestFile: OPENAPI_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: OPENAPI_PORT_FILE,
        portTypedefs: new Set(['OpenApiDocumentPort']),
      },
    ],
  },
  {
    key: 'rate-limit',
    manifestFile: RATE_LIMIT_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: RATE_LIMIT_PORT_FILE,
        portTypedefs: new Set(['RateLimiterPort']),
      },
    ],
  },
  {
    key: 'monitoring',
    manifestFile: MONITORING_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: MONITORING_PORT_FILE,
        portTypedefs: new Set(['MonitoringPort']),
      },
    ],
  },
  {
    key: 'job-queue',
    manifestFile: JOB_QUEUE_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: JOB_QUEUE_PORT_FILE,
        portTypedefs: new Set(['JobQueuePort']),
      },
    ],
  },
  {
    key: 'email',
    manifestFile: EMAIL_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: EMAIL_PORT_FILE,
        portTypedefs: new Set(['EmailPort']),
      },
    ],
  },
  {
    key: 'search',
    manifestFile: SEARCH_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: SEARCH_PORT_FILE,
        portTypedefs: new Set(['SearchPort']),
      },
    ],
  },
  {
    key: 'payments',
    manifestFile: PAYMENTS_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: PAYMENTS_PORT_FILE,
        portTypedefs: new Set(['PaymentsPort']),
      },
    ],
  },
  {
    key: 'tenancy',
    manifestFile: TENANCY_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: TENANCY_PORT_FILE,
        portTypedefs: new Set(['TenantStorePort']),
      },
    ],
  },
  {
    key: 'cqrs',
    manifestFile: CQRS_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: CQRS_COMMAND_BUS_PORT_FILE,
        portTypedefs: new Set(['CommandBusPort']),
      },
      {
        source: 'jsdoc',
        sourceFile: CQRS_QUERY_BUS_PORT_FILE,
        portTypedefs: new Set(['QueryBusPort']),
      },
      {
        source: 'jsdoc',
        sourceFile: CQRS_EVENT_STORE_PORT_FILE,
        portTypedefs: new Set(['EventStorePort']),
      },
    ],
  },
  {
    key: 'pwa',
    manifestFile: PWA_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: PWA_PORT_FILE,
        portTypedefs: new Set(['PwaAssetPort']),
      },
    ],
  },
  {
    key: 'seo',
    manifestFile: SEO_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: SEO_PORT_FILE,
        portTypedefs: new Set(['SeoPublisherPort']),
      },
    ],
  },
  {
    key: 'theme',
    manifestFile: THEME_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: THEME_PORT_FILE,
        portTypedefs: new Set(['ThemePreferenceStorePort']),
      },
    ],
  },
  {
    key: 'graphql',
    manifestFile: GRAPHQL_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: GRAPHQL_PORT_FILE,
        portTypedefs: new Set(['GraphqlTransportPort']),
      },
    ],
  },
  {
    key: 'prerender',
    manifestFile: PRERENDER_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: PRERENDER_RENDER_FUNCTION_PORT_FILE,
        portTypedefs: new Set(['RenderFunctionPort']),
      },
      {
        source: 'jsdoc',
        sourceFile: PRERENDER_STATIC_OUTPUT_PORT_FILE,
        portTypedefs: new Set(['StaticOutputPort']),
      },
    ],
  },
  {
    key: 'api-client',
    manifestFile: API_CLIENT_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: API_CLIENT_PORT_FILE,
        portTypedefs: new Set(['ApiClientPort']),
      },
    ],
  },
  {
    key: 'auth',
    manifestFile: AUTH_MANIFEST_FILE,
    sources: [
      { source: 'jsdoc', sourceFile: AUTH_PORT_FILE, portTypedefs: new Set(['AuthPort']) },
      {
        source: 'jsdoc',
        sourceFile: AUTH_OAUTH_PORT_FILE,
        portTypedefs: new Set(['OAuthProviderPort']),
      },
    ],
  },
  {
    key: 'ai-chat',
    manifestFile: AI_CHAT_MANIFEST_FILE,
    sources: [
      { source: 'jsdoc', sourceFile: AI_CHAT_PORT_FILE, portTypedefs: new Set(['AiChatPort']) },
    ],
  },
  {
    key: 'local-llm',
    manifestFile: LOCAL_LLM_MANIFEST_FILE,
    sources: [
      { source: 'jsdoc', sourceFile: LOCAL_LLM_PORT_FILE, portTypedefs: new Set(['LocalLlmPort']) },
    ],
  },
  {
    key: 'permission',
    manifestFile: PERMISSION_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: PERMISSION_PORT_FILE,
        portTypedefs: new Set(['PermissionPort']),
      },
    ],
  },
  {
    key: 'scheduler',
    manifestFile: SCHEDULER_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc',
        sourceFile: SCHEDULER_PORT_FILE,
        portTypedefs: new Set(['SchedulerPort']),
      },
    ],
  },
  // onboarding and feature-seams reference same-module domain shapes via
  // `import('../domain/...').X` — use the import-following source to pull
  // those shapes in and rewrite the type strings to bare names.
  {
    key: 'onboarding',
    manifestFile: ONBOARDING_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc-with-imports',
        sourceFile: ONBOARDING_PORT_FILE,
        moduleRoot: 'modules/onboarding',
        portTypedefs: new Set(['OnboardingPort']),
      },
    ],
  },
  {
    key: 'feature-seams',
    manifestFile: FEATURE_SEAMS_MANIFEST_FILE,
    sources: [
      {
        source: 'jsdoc-with-imports',
        sourceFile: FEATURE_SEAMS_PORT_FILE,
        moduleRoot: 'modules/feature-seams',
        portTypedefs: new Set(['SeamPort']),
      },
    ],
  },
  // realtime has TWO port files feeding ONE manifest — use the multi-source
  // pattern established by knowledge-graph (TPL-182).
  {
    key: 'realtime',
    manifestFile: REALTIME_MANIFEST_FILE,
    sources: [
      { source: 'jsdoc', sourceFile: REALTIME_PORT_FILE, portTypedefs: new Set(['RealtimePort']) },
      {
        source: 'jsdoc',
        sourceFile: REALTIME_TRANSPORT_PORT_FILE,
        portTypedefs: new Set(['TransportPort']),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Pure builders — no file I/O. Exported for unit tests.
// ---------------------------------------------------------------------------

/**
 * Build a capabilities shape from a parsed typedef map, a set of port
 * typedef names, and an adapters list. Deterministic: sorts typedef keys,
 * method keys, and the adapters array.
 *
 * @param {Record<string, object>} typedefs
 * @param {Set<string>} portTypedefs
 * @param {string[]} adapters
 * @returns {object}
 */
export function buildCapabilitiesFromTypedefs(typedefs, portTypedefs, adapters = []) {
  /** @type {Record<string, object>} */
  const ports = {};
  /** @type {Record<string, object>} */
  const supporting = {};

  for (const [name, entry] of Object.entries(typedefs)) {
    if (portTypedefs.has(name)) {
      ports[name] = portEntryFromInterface(entry);
    } else {
      supporting[name] = supportingFromRecord(entry);
    }
  }

  return {
    ports: sortObject(ports),
    typedefs: sortObject(supporting),
    adapters: [...adapters].sort(),
  };
}

/**
 * Build the capabilities shape for the cache module from port source
 * and an adapters list. JSDoc-sourced.
 *
 * @param {string} portSource
 * @param {string[]} adapters
 * @returns {object}
 */
export function buildCacheCapabilities(portSource, adapters = []) {
  const { typedefs } = parseJsdocTypedefs(portSource);
  return buildCapabilitiesFromTypedefs(typedefs, CACHE_PORT_TYPEDEFS, adapters);
}

/**
 * Build the capabilities shape for the retrieval module from its sibling
 * types.d.ts source and an adapters list. TypeScript-sourced.
 *
 * @param {string} typesSource
 * @param {string[]} adapters
 * @returns {object}
 */
export function buildRetrievalCapabilities(typesSource, adapters = []) {
  const { typedefs } = parseTypesDeclaration(typesSource);
  return buildCapabilitiesFromTypedefs(typedefs, RETRIEVAL_PORT_TYPEDEFS, adapters);
}

/**
 * Build the capabilities shape for a port whose JSDoc typedefs reference
 * shapes via `import('./relative.mjs').TypeName` from sibling files in the
 * same module (TPL-183). The resolver pulls in the referenced typedefs
 * (transitively, capped at depth 5), rewrites the verbose import-type
 * strings to bare names, and refuses to resolve any reference that escapes
 * `modules/<name>/`. See ADR-0010 "Domain shape resolution".
 *
 * @param {string} portSource    Source text of the port file.
 * @param {string} portFile      Repo-relative or absolute path of the port file.
 * @param {string} moduleRoot    Repo-relative or absolute path of `modules/<name>/`.
 * @param {Set<string>} portTypedefs  Names of typedefs that should land in `ports`.
 * @param {string[]} adapters    Sorted list of adapter filenames for the manifest.
 * @returns {object}
 */
export function buildJsdocWithImportsCapabilities(
  portSource,
  portFile,
  moduleRoot,
  portTypedefs,
  adapters = [],
) {
  const { typedefs: parsed } = parseJsdocTypedefs(portSource);
  const absPortFile = path.resolve(portFile);
  const absModuleRoot = path.resolve(moduleRoot);
  const { typedefs: resolved } = resolveImportTypedefs({
    portFile: absPortFile,
    moduleRoot: absModuleRoot,
    typedefs: parsed,
  });
  return buildCapabilitiesFromTypedefs(resolved, portTypedefs, adapters);
}

/**
 * Build the capabilities shape for the knowledge-graph entity-extractor
 * port file from JSDoc source and an adapters list (TPL-181). Only the
 * entity-extractor port file is wired here; graph-store-port belongs to
 * TPL-182.
 *
 * @param {string} portSource
 * @param {string[]} adapters
 * @returns {object}
 */
export function buildKnowledgeGraphEntityExtractorCapabilities(portSource, adapters = []) {
  const { typedefs } = parseJsdocTypedefs(portSource);
  return buildCapabilitiesFromTypedefs(typedefs, KG_ENTITY_EXTRACTOR_PORT_TYPEDEFS, adapters);
}

/**
 * Build the capabilities shape for the knowledge-graph graph-store port
 * file from JSDoc source and an adapters list (TPL-182). Only the
 * graph-store port file is wired here; merging with the entity-extractor
 * port file is handled by `mergeCapabilities` and the CLI loop.
 *
 * @param {string} portSource
 * @param {string[]} adapters
 * @returns {object}
 */
export function buildKnowledgeGraphGraphStoreCapabilities(portSource, adapters = []) {
  const { typedefs } = parseJsdocTypedefs(portSource);
  return buildCapabilitiesFromTypedefs(typedefs, KG_GRAPH_STORE_PORT_TYPEDEFS, adapters);
}

/**
 * Merge multiple per-source capabilities blocks into one. Combines
 * `ports`, `typedefs`, and uses the shared `adapters` list (the same on
 * every source — they all come from the same manifest). Sorts everything
 * deterministically. Errors out if two sources declare the same port name
 * (a misconfiguration symptom).
 *
 * @param {object[]} capabilitiesList
 * @returns {object}
 */
export function mergeCapabilities(capabilitiesList) {
  if (!Array.isArray(capabilitiesList) || capabilitiesList.length === 0) {
    throw new Error('mergeCapabilities: at least one capabilities block required');
  }
  if (capabilitiesList.length === 1) {
    // Fast path — preserve byte-identical single-source output.
    return capabilitiesList[0];
  }

  /** @type {Record<string, object>} */
  const ports = {};
  /** @type {Record<string, object>} */
  const typedefs = {};
  /** @type {string[]} */
  let adapters = [];

  for (const caps of capabilitiesList) {
    for (const [name, entry] of Object.entries(caps.ports || {})) {
      if (Object.prototype.hasOwnProperty.call(ports, name)) {
        throw new Error(`mergeCapabilities: duplicate port '${name}' declared by multiple sources`);
      }
      ports[name] = entry;
    }
    for (const [name, entry] of Object.entries(caps.typedefs || {})) {
      // Supporting typedefs may legitimately repeat across sources (e.g.
      // Entity / Relationship documented in two port files). Last-wins is
      // safe because the parser produces the same shape from the same
      // typedef. We do not error on supporting-typedef collisions.
      typedefs[name] = entry;
    }
    if (Array.isArray(caps.adapters) && caps.adapters.length > adapters.length) {
      adapters = caps.adapters;
    }
  }

  return {
    ports: sortObject(ports),
    typedefs: sortObject(typedefs),
    adapters: [...adapters].sort(),
  };
}

/**
 * Serialize a capabilities object with deterministic key order and a
 * trailing newline so diffs are stable.
 *
 * @param {object} capabilities
 * @returns {string}
 */
export function serializeCapabilities(capabilities) {
  return JSON.stringify(sortDeep(capabilities), null, 2);
}

/**
 * Compare a committed capabilities block against a generated one.
 * Returns null when they match byte-identically after normalization,
 * otherwise a short human-readable drift description.
 *
 * @param {object|undefined} committed
 * @param {object} generated
 * @returns {string|null}
 */
export function diffCapabilities(committed, generated) {
  if (committed === undefined || committed === null) {
    return 'manifest is missing the capabilities block';
  }
  const a = serializeCapabilities(committed);
  const b = serializeCapabilities(generated);
  if (a === b) return null;
  return 'manifest capabilities block is out of sync with the port source';
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function portEntryFromInterface(entry) {
  // The parser produces { kind: 'interface', methods: {...}, fields?: {...} }
  const methods = {};
  for (const [mName, mValue] of Object.entries(entry.methods || {})) {
    methods[mName] = {
      params: (mValue.params || []).map((p) => {
        const out = { name: p.name, type: p.type };
        if (p.optional) out.optional = true;
        if (p.rest) out.rest = true;
        return out;
      }),
      returns: mValue.returns,
    };
    if (mValue.optional) methods[mName].optional = true;
  }
  return { kind: 'interface', methods: sortObject(methods) };
}

function supportingFromRecord(entry) {
  // The parser produces one of:
  //   { kind: 'record',    fields: {...} }
  //   { kind: 'interface', methods: {...}, fields?: {...} }
  //   { kind: 'alias',     type: '<literal-or-union>' }
  // Supporting typedefs surface whichever payload is present so method-only
  // helper interfaces (e.g. retrieval's AugmentPrompt/Chunker) do not lose
  // their methods just because they are not listed as a port. Alias-form
  // typedefs (literal unions like NotificationLevel) flow through as a
  // single `alias` field so the manifest carries the original union text.
  if (entry && entry.kind === 'alias') {
    return { kind: 'alias', alias: entry.type };
  }
  const out = {};
  const fields = entry.fields || {};
  if (Object.keys(fields).length > 0 || !entry.methods) {
    const outFields = {};
    for (const [name, f] of Object.entries(fields)) {
      outFields[name] = { type: f.type };
      if (f.optional) outFields[name].optional = true;
    }
    out.fields = sortObject(outFields);
  }
  if (entry.methods && Object.keys(entry.methods).length > 0) {
    const outMethods = {};
    for (const [mName, mValue] of Object.entries(entry.methods)) {
      outMethods[mName] = {
        params: (mValue.params || []).map((p) => {
          const pe = { name: p.name, type: p.type };
          if (p.optional) pe.optional = true;
          if (p.rest) pe.rest = true;
          return pe;
        }),
        returns: mValue.returns,
      };
      if (mValue.optional) outMethods[mName].optional = true;
    }
    out.methods = sortObject(outMethods);
  }
  return out;
}

function sortObject(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
  return sorted;
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const wantJson = args.has('--json');
  const checkOnly = args.has('--check');

  const results = [];
  const errors = [];

  for (const target of MODULE_TARGETS) {
    if (!fileExists(target.manifestFile)) {
      errors.push(new ValidationError(`${target.manifestFile} not found`));
      continue;
    }

    const manifestRaw = await readText(target.manifestFile);
    const manifest = JSON.parse(manifestRaw);
    const adapters = (manifest.structure && manifest.structure.adapters) || [];

    /** @type {object[]} */
    const perSource = [];
    let sourceErrored = false;

    for (const src of target.sources) {
      if (!fileExists(src.sourceFile)) {
        errors.push(new ValidationError(`${src.sourceFile} not found`));
        sourceErrored = true;
        continue;
      }
      const sourceText = await readText(src.sourceFile);
      let built;
      try {
        if (src.source === 'jsdoc') {
          const { typedefs } = parseJsdocTypedefs(sourceText);
          built = buildCapabilitiesFromTypedefs(typedefs, src.portTypedefs, adapters);
        } else if (src.source === 'jsdoc-with-imports') {
          // ADR-0010 "Domain shape resolution": ports may reference domain
          // shapes via `import('../domain/foo.mjs').Foo` and the resolver
          // follows those imports within the SAME `modules/<name>/`
          // boundary only. A reference that escapes the module raises a
          // hard error from the resolver — this is intentional. Hex rules
          // forbid cross-module domain references and we want a clear,
          // file-anchored failure rather than a silent inline copy. If you
          // hit this error, the fix is to define the shape inside your
          // module (or call the other module through its public-api), not
          // to widen the resolver.
          built = buildJsdocWithImportsCapabilities(
            sourceText,
            src.sourceFile,
            src.moduleRoot,
            src.portTypedefs,
            adapters,
          );
        } else if (src.source === 'types-d') {
          const { typedefs } = parseTypesDeclaration(sourceText);
          built = buildCapabilitiesFromTypedefs(typedefs, src.portTypedefs, adapters);
        } else {
          errors.push(
            new ValidationError(`${target.key}: unknown capability source '${src.source}'`),
          );
          sourceErrored = true;
          continue;
        }
      } catch (err) {
        errors.push(
          new ValidationError(
            `${src.sourceFile}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        sourceErrored = true;
        continue;
      }

      // Guard: every declared port typedef must have been parsed.
      for (const portName of src.portTypedefs) {
        if (!built.ports[portName]) {
          errors.push(
            new ValidationError(
              `${src.sourceFile}: port typedef '${portName}' not found in source`,
            ),
          );
          sourceErrored = true;
        }
      }
      perSource.push(built);
    }

    if (sourceErrored) continue;

    let generated;
    try {
      generated = mergeCapabilities(perSource);
    } catch (err) {
      errors.push(
        new ValidationError(
          `${target.manifestFile}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      continue;
    }

    if (checkOnly) {
      const drift = diffCapabilities(manifest.capabilities, generated);
      if (drift) {
        errors.push(new ValidationError(`${target.manifestFile}: ${drift}`));
      }
      results.push({ target: target.manifestFile, mode: 'check' });
      continue;
    }

    // Write mode: splice the generated block into the manifest, preserving
    // all existing top-level keys in insertion order with capabilities last.
    const nextManifest = { ...manifest, capabilities: sortDeep(generated) };
    const nextRaw = JSON.stringify(nextManifest, null, 2) + '\n';
    const changed = await ensureWriteIfChanged(target.manifestFile, nextRaw);
    results.push({ target: target.manifestFile, mode: 'write', changed });
  }

  emit('capabilities-sync', errors, wantJson, {
    mode: checkOnly ? 'check' : 'write',
    targets: results,
  });
}

function emit(kind, errors, wantJson, data) {
  const output = result(kind, errors.length === 0, errors, [], data);
  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }
  if (!output.ok) {
    for (const e of output.errors) console.error(`ERROR: ${e.message ?? e}`);
    process.exit(1);
  }
  const targetDesc = Array.isArray(data.targets)
    ? data.targets.map((t) => t.target).join(', ')
    : data.target || '';
  console.log(`${kind}: OK (${data.mode}${targetDesc ? ' ' + targetDesc : ''})`);
}

function fail(wantJson, error) {
  const output = result('capabilities-sync', false, [error]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]?.message ?? output.errors[0]);
  process.exit(1);
}

// Only run the CLI when this file is the entrypoint, so importing it
// from tests does not trigger a manifest write or process.exit.
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((error) => {
    const output = result('capabilities-sync', false, [
      error instanceof Error ? error.message : String(error),
    ]);
    const wantJson = process.argv.includes('--json');
    if (wantJson) console.log(JSON.stringify(output, null, 2));
    else console.error(output.errors[0]);
    process.exit(1);
  });
}
