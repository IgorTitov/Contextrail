/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Main entry point for the api-starter application.
 * @sidecar app.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * API starter — server-side app shell.
 *
 * Minimal HTTP server using Node.js built-in `node:http` (zero external deps).
 * Wires server-side hex module adapters and exposes a simple JSON router.
 *
 * This is the server-side mirror of apps/starter/app.mjs — same hex modules,
 * different adapters, different platform.
 */

import { createServer } from 'node:http';

// Hex modules — all via public APIs
import { createMemoryLruAdapter } from '../../modules/cache/public-api.mjs';
import { createStructuredJsonAdapter } from '../../modules/log/public-api.mjs';
import { createNodeEventBus } from '../../modules/event-bus/public-api.mjs';
import { createMemoryDatabaseAdapter } from '../../modules/db/public-api.mjs';
import {
  createRouteRegistryOpenApiAdapter,
  assertOpenApiDocumentPort,
} from '../../modules/openapi/public-api.mjs';
import {
  createMemoryRateLimiter,
  assertRateLimiterPort,
} from '../../modules/rate-limit/public-api.mjs';
import {
  createConsoleMonitoringAdapter,
  createMemoryMonitoringAdapter,
  assertMonitoringPort,
} from '../../modules/monitoring/public-api.mjs';
import {
  createMemoryOAuthProvider,
  createGoogleOAuthProvider,
  createGitHubOAuthProvider,
  createNodePkcePair,
  createNodeOAuthState,
  assertOAuthProviderPort,
} from '../../modules/auth/public-api.mjs';
import {
  createMemoryJobQueue,
  createJobWorker,
  assertJobQueuePort,
} from '../../modules/job-queue/public-api.mjs';
import {
  createMemoryEmailAdapter,
  createConsoleEmailAdapter,
  assertEmailPort,
} from '../../modules/email/public-api.mjs';
import { createMemorySearchAdapter, assertSearchPort } from '../../modules/search/public-api.mjs';
import {
  createMemoryPaymentsAdapter,
  assertPaymentsPort,
} from '../../modules/payments/public-api.mjs';
import {
  createMemoryTenantStore,
  assertTenantStorePort,
} from '../../modules/tenancy/public-api.mjs';
import {
  createMemoryCommandBus,
  createMemoryQueryBus,
  createMemoryEventStore,
  createEvent,
  replayAggregate,
  assertCommandBusPort,
  assertQueryBusPort,
  assertEventStorePort,
} from '../../modules/cqrs/public-api.mjs';
import { createMemoryPwaAssetStore, assertPwaAssetPort } from '../../modules/pwa/public-api.mjs';
import { createMemorySeoPublisher, assertSeoPublisherPort } from '../../modules/seo/public-api.mjs';
import {
  createMemoryThemePreferenceStore,
  assertThemePreferenceStorePort,
} from '../../modules/theme/public-api.mjs';
import {
  createMemoryStaticOutput,
  assertStaticOutputPort,
} from '../../modules/prerender/public-api.mjs';

// App config
import { resolveConfig } from './app-config.mjs';

// Routes
import { healthHandler } from './routes/health.mjs';
import { greetHandler } from './routes/greeting.mjs';
import { openapiHandler } from './routes/openapi.mjs';
import {
  createPendingOAuthStore,
  createOAuthStartHandler,
  createOAuthCallbackHandler,
} from './routes/oauth.mjs';
import { enqueueJobHandler, listJobsHandler, runJobsHandler } from './routes/jobs.mjs';
import { sendEmailHandler, listEmailHandler } from './routes/email.mjs';
import { searchQueryHandler, searchIndexHandler, seedSearchIndex } from './routes/search.mjs';
import {
  createCustomerHandler,
  createIntentHandler,
  confirmIntentHandler,
  listIntentsHandler,
} from './routes/payments.mjs';
import { createTenantHandler, getTenantHandler, listTenantsHandler } from './routes/tenancy.mjs';
import { dispatchCommandHandler, askQueryHandler, listEventsHandler } from './routes/cqrs.mjs';
import { pwaManifestHandler, pwaServiceWorkerHandler } from './routes/pwa.mjs';
import { seoSitemapHandler, seoRobotsHandler, seoMetaHandler } from './routes/seo.mjs';
import {
  themeTokensHandler,
  themePreferenceGetHandler,
  themePreferenceSetHandler,
} from './routes/theme.mjs';
import { graphqlHandler } from './routes/graphql.mjs';
import { prerenderRunHandler, prerenderOutputHandler } from './routes/prerender.mjs';

/**
 * Create the application context with wired adapters.
 * Adapter selection can be swapped based on config.mode.
 *
 * @param {{ mode: string, port: number, host: string, rateLimit: { capacity: number, refillPerSecond: number }, monitoring?: { mode?: 'console' | 'memory', redactKeys?: string[] }, oauth?: { provider?: 'memory' | 'google' | 'github', clientId?: string, clientSecret?: string, redirectUri?: string }, email?: { mode?: 'memory' | 'console', from?: string } }} config
 */
export function createAppContext(config) {
  const log = createStructuredJsonAdapter({
    minLevel: config.mode === 'production' ? 'info' : 'debug',
  });

  const cache = createMemoryLruAdapter({ maxEntries: 1000, defaultTtl: 60000 });
  const eventBus = createNodeEventBus();
  const db = createMemoryDatabaseAdapter();
  const openapi = createOpenApiProvider(config);
  const rateLimit = config.rateLimit ?? { capacity: 60, refillPerSecond: 30 };
  const rateLimiter = createMemoryRateLimiter({
    capacity: rateLimit.capacity,
    refillPerSecond: rateLimit.refillPerSecond,
  });
  assertRateLimiterPort(rateLimiter);

  const monitoringOptions = {
    redactKeys: config.monitoring?.redactKeys ?? ['authorization', 'cookie', 'password'],
  };
  const monitoring =
    config.monitoring?.mode === 'memory'
      ? createMemoryMonitoringAdapter(monitoringOptions)
      : createConsoleMonitoringAdapter(monitoringOptions);
  assertMonitoringPort(monitoring);

  const oauthProvider = createOAuthProvider(config);
  assertOAuthProviderPort(oauthProvider);
  const pendingOAuth = createPendingOAuthStore();
  const oauthRedirectUri =
    config.oauth?.redirectUri ?? `http://${config.host}:${config.port}/auth/oauth/callback`;

  const mailer =
    config.email?.mode === 'console'
      ? createConsoleEmailAdapter({
          log: (summary) => log.info('Email sent', summary),
        })
      : createMemoryEmailAdapter();
  assertEmailPort(mailer);
  const emailFrom = config.email?.from ?? 'hello@api-starter.local';

  const searchIndex = createMemorySearchAdapter();
  assertSearchPort(searchIndex);

  const payments = createMemoryPaymentsAdapter();
  assertPaymentsPort(payments);

  const tenancy = createMemoryTenantStore();
  assertTenantStorePort(tenancy);

  const pwaAssets = createMemoryPwaAssetStore();
  assertPwaAssetPort(pwaAssets);

  const seoPublisher = createMemorySeoPublisher();
  assertSeoPublisherPort(seoPublisher);

  const themeStore = createMemoryThemePreferenceStore();
  assertThemePreferenceStorePort(themeStore);

  const prerenderOutput = createMemoryStaticOutput();
  assertStaticOutputPort(prerenderOutput);

  const eventStore = createMemoryEventStore();
  const commandBus = createMemoryCommandBus({ eventStore });
  const queryBus = createMemoryQueryBus();
  assertEventStorePort(eventStore);
  assertCommandBusPort(commandBus);
  assertQueryBusPort(queryBus);

  // Demo CQRS handlers — Counter.Increment appends a Counter.Incremented
  // event, Counter.Get replays the counter stream into a running total.
  // This is the smallest proof that the command/query/event flow wires
  // correctly end-to-end through the api-starter.
  const counterReducer = (state, event) => {
    if (event.type === 'Counter.Incremented') {
      return { total: state.total + (event.payload.by ?? 0) };
    }
    return state;
  };
  commandBus.register('Counter.Increment', async (command, { eventStore }) => {
    const by = Number(command.payload.by ?? 1);
    const existing = await eventStore.load('counter');
    await eventStore.append('counter', existing.length, [
      createEvent({
        type: 'Counter.Incremented',
        aggregateId: 'counter',
        payload: { by },
      }),
    ]);
    return { by };
  });
  queryBus.register('Counter.Get', async () => {
    const events = await eventStore.load('counter');
    const { state } = replayAggregate('counter', { total: 0 }, counterReducer, events);
    return state;
  });

  const jobQueue = createMemoryJobQueue();
  assertJobQueuePort(jobQueue);
  const jobWorker = createJobWorker({
    queue: jobQueue,
    handlers: {
      demo: async (payload) => {
        log.info('Demo job handled', { payload });
      },
      email: async (payload) => {
        log.info('Email job handled', { to: payload?.to });
      },
      'send-email': async (payload) => {
        await mailer.send(payload);
      },
    },
    onEvent: (e) => {
      log.debug('Job event', { type: e.type, id: e.job.id, error: e.error });
    },
  });

  return {
    config,
    log,
    cache,
    eventBus,
    db,
    openapi,
    rateLimiter,
    monitoring,
    oauthProvider,
    pendingOAuth,
    oauthRedirectUri,
    jobQueue,
    jobWorker,
    mailer,
    emailFrom,
    searchIndex,
    payments,
    tenancy,
    eventStore,
    commandBus,
    queryBus,
    pwaAssets,
    seoPublisher,
    themeStore,
    prerenderOutput,
    /** @type {Array<{ method: string, path: string, handler: Function }>} */
    prerenderRoutes: [],
  };
}

/**
 * Resolve the configured OAuth provider. Defaults to the in-memory
 * provider so the starter works offline and integration tests stay
 * deterministic. Switch to google or github by setting
 * `config.oauth.provider` (plus clientId/clientSecret) when deploying.
 *
 * @param {{ oauth?: { provider?: 'memory' | 'google' | 'github', clientId?: string, clientSecret?: string, redirectUri?: string } }} config
 */
function createOAuthProvider(config) {
  const provider = config.oauth?.provider ?? 'memory';
  if (provider === 'google') {
    return createGoogleOAuthProvider({
      clientId: config.oauth?.clientId ?? 'missing-google-client-id',
      clientSecret: config.oauth?.clientSecret ?? 'missing-google-client-secret',
    });
  }
  if (provider === 'github') {
    return createGitHubOAuthProvider({
      clientId: config.oauth?.clientId ?? 'missing-github-client-id',
      clientSecret: config.oauth?.clientSecret ?? 'missing-github-client-secret',
    });
  }
  return createMemoryOAuthProvider({ providerName: 'memory' });
}

/**
 * OAuth start route — adapts the curried handler to the (req, ctx)
 * signature used by the rest of the router so every registered route
 * stays symmetric.
 *
 * @param {{ query: URLSearchParams, method: string, pathname: string }} req
 * @param {ReturnType<typeof createAppContext>} ctx
 */
async function oauthStartRoute(req, ctx) {
  const handler = createOAuthStartHandler({
    provider: ctx.oauthProvider,
    pkceFactory: createNodePkcePair,
    stateFactory: createNodeOAuthState,
    store: ctx.pendingOAuth,
    redirectUri: ctx.oauthRedirectUri,
  });
  return handler(req);
}

/**
 * OAuth callback route companion to {@link oauthStartRoute}.
 *
 * @param {{ query: URLSearchParams, method: string, pathname: string }} req
 * @param {ReturnType<typeof createAppContext>} ctx
 */
async function oauthCallbackRoute(req, ctx) {
  const handler = createOAuthCallbackHandler({
    provider: ctx.oauthProvider,
    store: ctx.pendingOAuth,
  });
  return handler(req);
}

/**
 * Simple JSON router.
 * Maps method + path to handler functions.
 *
 * @typedef {{ method: string, path: string, handler: Function }} Route
 */

/**
 * Route registry — single source of truth for both the HTTP router
 * below and the OpenAPI document exposed at /openapi.json.
 *
 * @typedef {{ method: string, path: string, handler: Function, openapi?: object }} RegisteredRoute
 * @type {RegisteredRoute[]}
 */
const routes = [
  {
    method: 'GET',
    path: '/health',
    handler: healthHandler,
    openapi: {
      summary: 'Liveness probe',
      tags: ['system'],
      responses: {
        200: { description: 'Server is healthy' },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/greet',
    handler: greetHandler,
    openapi: {
      summary: 'Greet a name (cached)',
      tags: ['demo'],
      parameters: [
        {
          name: 'name',
          in: 'query',
          required: false,
          description: 'Name to greet (defaults to "World")',
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: { description: 'Greeting message' },
      },
    },
  },
  {
    method: 'GET',
    path: '/auth/oauth/start',
    handler: oauthStartRoute,
    openapi: {
      summary: 'Begin an OAuth 2.0 authorization code flow with PKCE',
      tags: ['auth'],
      responses: {
        200: { description: 'Authorization URL and opaque state' },
      },
    },
  },
  {
    method: 'GET',
    path: '/auth/oauth/callback',
    handler: oauthCallbackRoute,
    openapi: {
      summary: 'Complete the OAuth flow: exchange code for tokens and fetch user',
      tags: ['auth'],
      parameters: [
        { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Authenticated user profile' },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/jobs/enqueue',
    handler: enqueueJobHandler,
    openapi: {
      summary: 'Enqueue a demo background job',
      tags: ['jobs'],
      parameters: [{ name: 'name', in: 'query', required: false, schema: { type: 'string' } }],
      responses: { 200: { description: 'Enqueued job descriptor' } },
    },
  },
  {
    method: 'GET',
    path: '/api/jobs',
    handler: listJobsHandler,
    openapi: {
      summary: 'List background jobs (optionally filtered by status)',
      tags: ['jobs'],
      parameters: [{ name: 'status', in: 'query', required: false, schema: { type: 'string' } }],
      responses: { 200: { description: 'Job snapshot' } },
    },
  },
  {
    method: 'GET',
    path: '/api/jobs/run',
    handler: runJobsHandler,
    openapi: {
      summary: 'Drain the background job worker once',
      tags: ['jobs'],
      responses: { 200: { description: 'Number of jobs processed' } },
    },
  },
  {
    method: 'GET',
    path: '/api/email/send',
    handler: sendEmailHandler,
    openapi: {
      summary: 'Validate and enqueue an outbound email via the job queue',
      tags: ['email'],
      parameters: [
        { name: 'to', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'from', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'subject', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'text', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Enqueued email job descriptor' } },
    },
  },
  {
    method: 'GET',
    path: '/api/email/list',
    handler: listEmailHandler,
    openapi: {
      summary: 'List delivered emails (optionally filtered by status)',
      tags: ['email'],
      parameters: [{ name: 'status', in: 'query', required: false, schema: { type: 'string' } }],
      responses: { 200: { description: 'Snapshot of delivered messages' } },
    },
  },
  {
    method: 'GET',
    path: '/api/search/query',
    handler: searchQueryHandler,
    openapi: {
      summary: 'Run a full-text search against the in-memory index',
      tags: ['search'],
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
        { name: 'tag', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Ranked search hits with highlights' } },
    },
  },
  {
    method: 'GET',
    path: '/api/search/index',
    handler: searchIndexHandler,
    openapi: {
      summary: 'Index (or replace) one document in the search index',
      tags: ['search'],
      parameters: [
        { name: 'id', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'title', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'body', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Indexed document id' } },
    },
  },
  {
    method: 'GET',
    path: '/api/payments/customer',
    handler: createCustomerHandler,
    openapi: {
      summary: 'Create a payments customer',
      tags: ['payments'],
      parameters: [
        { name: 'email', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Created customer' } },
    },
  },
  {
    method: 'GET',
    path: '/api/payments/intent',
    handler: createIntentHandler,
    openapi: {
      summary: 'Create a payment intent (requires_payment_method)',
      tags: ['payments'],
      parameters: [
        { name: 'amount', in: 'query', required: true, schema: { type: 'integer' } },
        { name: 'currency', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'description', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'customerId', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Created intent' } },
    },
  },
  {
    method: 'GET',
    path: '/api/payments/confirm',
    handler: confirmIntentHandler,
    openapi: {
      summary: 'Confirm a payment intent with a payment method',
      tags: ['payments'],
      parameters: [
        { name: 'id', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'pm', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Confirmed intent' } },
    },
  },
  {
    method: 'GET',
    path: '/api/payments/list',
    handler: listIntentsHandler,
    openapi: {
      summary: 'List payment intents (optionally filtered by status / customerId)',
      tags: ['payments'],
      parameters: [
        { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'customerId', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Intent snapshot' } },
    },
  },
  {
    method: 'GET',
    path: '/api/tenancy/create',
    handler: createTenantHandler,
    openapi: {
      summary: 'Create a tenant',
      tags: ['tenancy'],
      parameters: [
        { name: 'id', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'name', in: 'query', required: false, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Created tenant' } },
    },
  },
  {
    method: 'GET',
    path: '/api/tenancy/get',
    handler: getTenantHandler,
    openapi: {
      summary: 'Fetch a tenant by id',
      tags: ['tenancy'],
      parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Tenant lookup result (found flag + tenant)' } },
    },
  },
  {
    method: 'GET',
    path: '/api/tenancy/list',
    handler: listTenantsHandler,
    openapi: {
      summary: 'List known tenants (snapshot of the in-memory store)',
      tags: ['tenancy'],
      responses: { 200: { description: 'Tenant snapshot' } },
    },
  },
  {
    method: 'GET',
    path: '/api/cqrs/dispatch',
    handler: dispatchCommandHandler,
    openapi: {
      summary: 'Dispatch a command through the CQRS command bus',
      tags: ['cqrs'],
      parameters: [
        { name: 'type', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'by', in: 'query', required: false, schema: { type: 'integer' } },
      ],
      responses: { 200: { description: 'Command dispatched — handler result' } },
    },
  },
  {
    method: 'GET',
    path: '/api/cqrs/ask',
    handler: askQueryHandler,
    openapi: {
      summary: 'Ask a query through the CQRS query bus',
      tags: ['cqrs'],
      parameters: [{ name: 'type', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Query result' } },
    },
  },
  {
    method: 'GET',
    path: '/api/cqrs/events',
    handler: listEventsHandler,
    openapi: {
      summary: 'List all events recorded in the in-memory event store',
      tags: ['cqrs'],
      responses: { 200: { description: 'Event snapshot' } },
    },
  },
  {
    method: 'GET',
    path: '/manifest.webmanifest',
    handler: pwaManifestHandler,
    openapi: {
      summary: 'W3C Web App Manifest for the PWA shell',
      tags: ['pwa'],
      responses: { 200: { description: 'application/manifest+json document' } },
    },
  },
  {
    method: 'GET',
    path: '/sw.js',
    handler: pwaServiceWorkerHandler,
    openapi: {
      summary: 'Generated service worker source',
      tags: ['pwa'],
      responses: { 200: { description: 'application/javascript service worker' } },
    },
  },
  {
    method: 'GET',
    path: '/sitemap.xml',
    handler: seoSitemapHandler,
    openapi: {
      summary: 'Site map per the sitemaps.org protocol',
      tags: ['seo'],
      responses: { 200: { description: 'application/xml sitemap' } },
    },
  },
  {
    method: 'GET',
    path: '/robots.txt',
    handler: seoRobotsHandler,
    openapi: {
      summary: 'robots.txt body',
      tags: ['seo'],
      responses: { 200: { description: 'text/plain robots.txt' } },
    },
  },
  {
    method: 'GET',
    path: '/api/seo/meta',
    handler: seoMetaHandler,
    openapi: {
      summary: 'Rendered HTML meta tag block for a page',
      tags: ['seo'],
      parameters: [{ name: 'page', in: 'query', required: false, schema: { type: 'string' } }],
      responses: { 200: { description: 'JSON { html } with rendered meta tag markup' } },
    },
  },
  {
    method: 'GET',
    path: '/api/theme/tokens',
    handler: themeTokensHandler,
    openapi: {
      summary: 'Render CSS custom-property variables for a color scheme',
      tags: ['theme'],
      parameters: [
        {
          name: 'scheme',
          in: 'query',
          required: false,
          description:
            'light, dark, or auto (auto resolves against a demo light system preference)',
          schema: { type: 'string' },
        },
      ],
      responses: { 200: { description: 'JSON { scheme, css } with rendered :root block' } },
    },
  },
  {
    method: 'GET',
    path: '/api/theme/preference',
    handler: themePreferenceGetHandler,
    openapi: {
      summary: 'Fetch a stored theme preference for a user',
      tags: ['theme'],
      parameters: [{ name: 'user', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Stored preference or { stored: false }' } },
    },
  },
  {
    method: 'GET',
    path: '/api/theme/preference/set',
    handler: themePreferenceSetHandler,
    openapi: {
      summary: 'Persist a theme preference for a user',
      tags: ['theme'],
      parameters: [
        { name: 'user', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'scheme', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Persisted preference' } },
    },
  },
  {
    method: 'GET',
    path: '/api/graphql',
    handler: graphqlHandler,
    openapi: {
      summary: 'Execute a GraphQL query against the demo schema',
      tags: ['graphql'],
      parameters: [
        {
          name: 'query',
          in: 'query',
          required: false,
          description: 'GraphQL query string (defaults to `{ hello }`)',
          schema: { type: 'string' },
        },
      ],
      responses: { 200: { description: 'JSON { query, data, errors } result envelope' } },
    },
  },
  {
    method: 'GET',
    path: '/api/prerender/run',
    handler: prerenderRunHandler,
    openapi: {
      summary: 'Run a demo sequential prerender over a small route manifest',
      tags: ['prerender'],
      responses: {
        200: {
          description:
            'JSON { baseUrl, rendered, failed, durationMs, stored } summary of the prerender pass',
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/prerender/output',
    handler: prerenderOutputHandler,
    openapi: {
      summary: 'Fetch the stored HTML body for a previously prerendered path',
      tags: ['prerender'],
      parameters: [{ name: 'path', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'JSON { path, html } or an error envelope' } },
    },
  },
  {
    method: 'GET',
    path: '/openapi.json',
    handler: openapiHandler,
    openapi: {
      summary: 'OpenAPI 3 document for this API',
      tags: ['system'],
      responses: {
        200: { description: 'OpenAPI 3.0.3 document' },
      },
    },
  },
];

/**
 * Build the OpenApiDocumentPort from the route registry above.
 * Exported so tests can introspect the document without spinning up the server.
 *
 * @param {{ mode: string, port: number, host: string }} config
 */
export function createOpenApiProvider(config) {
  const provider = createRouteRegistryOpenApiAdapter({
    info: {
      title: 'api-starter',
      version: '0.4.0',
      description: 'Reference server-side starter app for the contextrail template.',
    },
    servers: [{ url: `http://${config.host}:${config.port}`, description: config.mode }],
    routes: routes.map((r) => ({
      method: r.method,
      path: r.path,
      ...(r.openapi ?? {}),
    })),
  });
  assertOpenApiDocumentPort(provider);
  return provider;
}

/**
 * Parse URL and query string from a request.
 * @param {import('node:http').IncomingMessage} req
 * @returns {{ pathname: string, query: URLSearchParams }}
 */
function parseUrl(req) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return { pathname: url.pathname, query: url.searchParams };
}

/**
 * Default CORS headers.
 * Override via config.cors for production use.
 */
const DEFAULT_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Marker key on a handler result that requests a raw (non-JSON) response.
 * Handlers that need a custom content-type (sitemap.xml, manifest.webmanifest,
 * sw.js, robots.txt, …) return `{ [RAW_RESPONSE]: true, contentType, body }`
 * and the router writes the body verbatim with the given content-type.
 */
export const RAW_RESPONSE = Symbol.for('contextrail.api-starter.raw-response');

/**
 * Send a raw (non-JSON) response with a caller-supplied content-type.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {{ contentType: string, body: string }} payload
 */
function sendRaw(res, status, payload) {
  const buffer = Buffer.from(payload.body, 'utf8');
  res.writeHead(status, {
    'Content-Type': payload.contentType,
    'Content-Length': buffer.byteLength,
    ...DEFAULT_CORS,
  });
  res.end(buffer);
}

/**
 * Send a JSON response.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string | number>} [extraHeaders]
 */
function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...DEFAULT_CORS,
    ...extraHeaders,
  });
  res.end(payload);
}

/**
 * Derive a stable rate-limit key from an incoming request.
 * Uses the remote address plus the request method — good-enough default for
 * a starter template. Replace with user id / api key in real deployments.
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {string}
 */
function rateLimitKey(req) {
  const ip = req.socket?.remoteAddress || 'unknown';
  return `${ip}:${(req.method || 'GET').toUpperCase()}`;
}

/**
 * Create and start the HTTP server.
 *
 * @param {object} [options]
 * @param {{ mode: string, port: number, host: string }} [options.config]
 * @returns {{ server: import('node:http').Server, ctx: ReturnType<typeof createAppContext> }}
 */
export function startServer(options = {}) {
  const config = options.config || resolveConfig();
  const ctx = createAppContext(config);

  // Expose the route registry on the context so the prerender demo's
  // inline render function can delegate back into the same handlers the
  // HTTP router uses. This is intentional: the prerender module itself
  // stays framework-agnostic; the coupling only exists at the app-layer
  // seam where we wire a concrete render function.
  ctx.prerenderRoutes = routes;

  // Seed the in-memory search index so /api/search/query returns hits out
  // of the box. Fire-and-forget — the adapter is synchronous under the hood.
  seedSearchIndex(ctx.searchIndex).catch((err) => {
    ctx.log.error('Search seed failed', { error: err.message });
  });

  const server = createServer(async (req, res) => {
    const { pathname, query } = parseUrl(req);
    const method = (req.method || 'GET').toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, DEFAULT_CORS);
      res.end();
      return;
    }

    // Rate limiting — gate before the route lookup.
    const decision = ctx.rateLimiter.check(rateLimitKey(req));
    if (!decision.allowed) {
      ctx.monitoring.increment('http.rate_limited', 1, { method, path: pathname });
      sendJson(
        res,
        429,
        { error: 'Too Many Requests', retryAfterMs: decision.retryAfterMs },
        {
          'Retry-After': Math.max(1, Math.ceil(decision.retryAfterMs / 1000)),
          'X-RateLimit-Remaining': String(decision.remaining),
        },
      );
      return;
    }

    const route = routes.find((r) => r.method === method && r.path === pathname);

    if (!route) {
      ctx.monitoring.increment('http.request', 1, { method, path: pathname, status: '404' });
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const span = ctx.monitoring.startSpan('http.request', { method, path: pathname });
    try {
      const result = await route.handler({ query, method, pathname }, ctx);
      ctx.monitoring.increment('http.request', 1, { method, path: pathname, status: '200' });
      span.end('ok');
      if (result && typeof result === 'object' && result[RAW_RESPONSE] === true) {
        sendRaw(res, 200, /** @type {{ contentType: string, body: string }} */ (result));
      } else {
        sendJson(res, 200, result);
      }
    } catch (err) {
      ctx.monitoring.captureException(err, { tags: { method, path: pathname } });
      ctx.monitoring.increment('http.request', 1, { method, path: pathname, status: '500' });
      span.end('error');
      ctx.log.error('Route error', { path: pathname, error: err.message });
      sendJson(res, 500, { error: 'Internal server error' });
    }
  });

  server.listen(config.port, config.host, () => {
    ctx.log.info(`API server started`, { port: config.port, mode: config.mode });
  });

  return { server, ctx };
}

// Auto-start when run directly
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isDirectRun) {
  startServer();
}
