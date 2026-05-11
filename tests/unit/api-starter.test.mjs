/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of api-starter-test in this repository.
 * @sidecar api-starter.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAppContext, startServer } from '../../apps/api-starter/app.mjs';
import {
  MODES,
  detectMode,
  getMode,
  setMode,
  resolveConfig,
  resetConfig,
} from '../../apps/api-starter/app-config.mjs';

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

describe('api-starter — app-config', () => {
  afterEach(() => {
    resetConfig();
  });

  test('MODES contains development, production, test', () => {
    assert.equal(MODES.development, 'development');
    assert.equal(MODES.production, 'production');
    assert.equal(MODES.test, 'test');
  });

  test('MODES is frozen', () => {
    assert.ok(Object.isFrozen(MODES));
  });

  test('getMode returns development by default', () => {
    assert.equal(getMode(), 'development');
  });

  test('setMode changes mode', () => {
    setMode('production');
    assert.equal(getMode(), 'production');
  });

  test('setMode throws for unknown mode', () => {
    assert.throws(() => setMode('invalid'), Error);
  });

  test('resetConfig restores development mode', () => {
    setMode('production');
    resetConfig();
    assert.equal(getMode(), 'development');
  });
});

// ---------------------------------------------------------------------------
// App context
// ---------------------------------------------------------------------------

describe('api-starter — createAppContext', () => {
  test('creates context with all expected adapters', () => {
    const ctx = createAppContext({ mode: 'test', port: 3000, host: '0.0.0.0' });
    assert.ok(ctx.log);
    assert.ok(ctx.cache);
    assert.ok(ctx.eventBus);
    assert.ok(ctx.db);
    assert.equal(ctx.config.mode, 'test');
  });

  test('cache adapter works', () => {
    const ctx = createAppContext({ mode: 'test', port: 3000, host: '0.0.0.0' });
    ctx.cache.set('k', 'v');
    assert.equal(ctx.cache.get('k'), 'v');
  });

  test('log adapter works', () => {
    const ctx = createAppContext({ mode: 'test', port: 3000, host: '0.0.0.0' });
    // Should not throw
    ctx.log.info('test message');
    ctx.log.error('test error', { code: 500 });
  });

  test('event-bus adapter works', () => {
    const ctx = createAppContext({ mode: 'test', port: 3000, host: '0.0.0.0' });
    let received = null;
    ctx.eventBus.on('test', (data) => {
      received = data;
    });
    ctx.eventBus.emit('test', 'hello');
    assert.equal(received, 'hello');
  });

  test('db adapter works', () => {
    const ctx = createAppContext({ mode: 'test', port: 3000, host: '0.0.0.0' });
    ctx.db.execute('CREATE TABLE IF NOT EXISTS t (x TEXT)');
    ctx.db.execute('INSERT INTO t (x) VALUES (?)', ['hi']);
    const result = ctx.db.query('SELECT * FROM t');
    assert.equal(result.rowCount, 1);
  });

  test('openapi provider returns a valid OpenAPI 3.0.3 document covering all routes', () => {
    const ctx = createAppContext({ mode: 'test', port: 3000, host: '127.0.0.1' });
    assert.equal(typeof ctx.openapi.getDocument, 'function');
    const doc = ctx.openapi.getDocument();
    assert.equal(doc.openapi, '3.0.3');
    assert.equal(doc.info.title, 'api-starter');
    assert.ok(doc.paths['/health'].get);
    assert.ok(doc.paths['/api/greet'].get);
    assert.ok(doc.paths['/openapi.json'].get);
    assert.equal(doc.servers[0].url, 'http://127.0.0.1:3000');
  });

  test('rateLimiter is wired with configurable capacity and refill', () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 2, refillPerSecond: 1 },
    });
    assert.equal(typeof ctx.rateLimiter.check, 'function');
    assert.equal(ctx.rateLimiter.check('unit').allowed, true);
    assert.equal(ctx.rateLimiter.check('unit').allowed, true);
    assert.equal(ctx.rateLimiter.check('unit').allowed, false);
  });

  test('monitoring is wired with a MonitoringPort-compliant adapter', () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
      monitoring: { mode: 'memory' },
    });
    assert.equal(typeof ctx.monitoring.captureException, 'function');
    assert.equal(typeof ctx.monitoring.startSpan, 'function');
    const metric = ctx.monitoring.increment('unit.test');
    assert.equal(metric.name, 'unit.test');
    // The memory adapter exposes a buffer reader for tests.
    assert.equal(typeof ctx.monitoring.metrics, 'function');
    assert.equal(ctx.monitoring.metrics().length, 1);
  });

  test('oauthProvider defaults to the memory provider and is port-compliant', () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(ctx.oauthProvider.providerName, 'memory');
    assert.equal(typeof ctx.oauthProvider.buildAuthorizationUrl, 'function');
    assert.equal(typeof ctx.oauthProvider.exchangeCode, 'function');
    assert.equal(typeof ctx.oauthProvider.fetchUserInfo, 'function');
    assert.ok(ctx.pendingOAuth instanceof Map);
    assert.ok(ctx.oauthRedirectUri.endsWith('/auth/oauth/callback'));
  });

  test('jobQueue defaults to the memory adapter and worker drains enqueued jobs', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.jobQueue.enqueue, 'function');
    assert.equal(typeof ctx.jobQueue.dequeue, 'function');
    assert.equal(typeof ctx.jobWorker.runUntilEmpty, 'function');

    ctx.jobQueue.enqueue('demo', { x: 1 });
    ctx.jobQueue.enqueue('email', { to: 'a@b.c' });
    assert.equal(ctx.jobQueue.size('pending'), 2);

    const processed = await ctx.jobWorker.runUntilEmpty();
    assert.equal(processed, 2);
    assert.equal(ctx.jobQueue.size('completed'), 2);
    assert.equal(ctx.jobQueue.size('pending'), 0);
  });

  test('mailer defaults to the memory adapter and send-email jobs deliver via the worker', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.mailer.send, 'function');
    assert.equal(typeof ctx.mailer.list, 'function');

    ctx.jobQueue.enqueue('send-email', {
      from: 'hello@api-starter.local',
      to: 'alice@example.com',
      subject: 'Welcome',
      text: 'Hi',
    });
    const processed = await ctx.jobWorker.runUntilEmpty();
    assert.equal(processed, 1);
    assert.equal(ctx.mailer.list('sent').length, 1);
    assert.equal(ctx.mailer.list('sent')[0].message.to[0], 'alice@example.com');
  });

  test('searchIndex exposes the SearchPort and runs an index+query round trip', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.searchIndex.index, 'function');
    assert.equal(typeof ctx.searchIndex.search, 'function');

    await ctx.searchIndex.index({
      id: 'ctx-1',
      fields: { title: 'Hexagonal context', body: 'Ports and adapters' },
    });
    const result = await ctx.searchIndex.search('hexagonal');
    assert.equal(result.total, 1);
    assert.equal(result.hits[0].id, 'ctx-1');
  });

  test('payments exposes the PaymentsPort and runs a create+confirm round trip', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.payments.createCustomer, 'function');
    assert.equal(typeof ctx.payments.createPaymentIntent, 'function');
    assert.equal(typeof ctx.payments.verifyWebhook, 'function');

    const customer = await ctx.payments.createCustomer({ email: 'alice@example.com' });
    const intent = await ctx.payments.createPaymentIntent({
      amount: { amount: 1999, currency: 'USD' },
      customerId: customer.id,
    });
    assert.equal(intent.status, 'requires_payment_method');
    const confirmed = await ctx.payments.confirmPaymentIntent(intent.id, {
      paymentMethod: 'pm_card_visa',
    });
    assert.equal(confirmed.status, 'succeeded');
  });

  test('tenancy exposes the TenantStorePort and runs a create+get round trip', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.tenancy.createTenant, 'function');
    assert.equal(typeof ctx.tenancy.getTenant, 'function');
    assert.equal(typeof ctx.tenancy.listTenants, 'function');

    const tenant = await ctx.tenancy.createTenant({ id: 'acme', name: 'Acme, Inc.' });
    assert.equal(tenant.id, 'acme');
    const fetched = await ctx.tenancy.getTenant('acme');
    assert.equal(fetched.id, 'acme');
    assert.equal(fetched.name, 'Acme, Inc.');
    assert.equal(ctx.tenancy.listTenants().length, 1);
  });

  test('pwaAssets exposes the PwaAssetPort and lazily writes the demo manifest + service worker', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.pwaAssets.writeManifest, 'function');
    assert.equal(typeof ctx.pwaAssets.writeServiceWorker, 'function');
    assert.equal(typeof ctx.pwaAssets.listAssets, 'function');
    // Nothing generated yet — routes lazily fill the store on first request.
    assert.equal(ctx.pwaAssets.listAssets().length, 0);
  });

  test('seoPublisher exposes the SeoPublisherPort', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.seoPublisher.publishSitemap, 'function');
    assert.equal(typeof ctx.seoPublisher.publishRobots, 'function');
    assert.equal(typeof ctx.seoPublisher.publishMeta, 'function');
  });

  test('themeStore exposes the ThemePreferenceStorePort', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.themeStore.get, 'function');
    assert.equal(typeof ctx.themeStore.set, 'function');
    assert.equal(typeof ctx.themeStore.clear, 'function');
  });

  test('cqrs buses are wired into the context with a demo Counter handler', async () => {
    const ctx = createAppContext({
      mode: 'test',
      port: 3000,
      host: '127.0.0.1',
      rateLimit: { capacity: 60, refillPerSecond: 30 },
    });
    assert.equal(typeof ctx.commandBus.dispatch, 'function');
    assert.equal(typeof ctx.queryBus.ask, 'function');
    assert.equal(typeof ctx.eventStore.append, 'function');

    await ctx.commandBus.dispatch({ type: 'Counter.Increment', payload: { by: 3 } });
    await ctx.commandBus.dispatch({ type: 'Counter.Increment', payload: { by: 4 } });
    const state = await ctx.queryBus.ask({ type: 'Counter.Get', payload: {} });
    assert.deepEqual(state, { total: 7 });
    assert.equal(ctx.eventStore.loadAll().length, 2);
  });
});

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

describe('api-starter — HTTP server', () => {
  /** @type {import('node:http').Server | null} */
  let server = null;

  afterEach((t, done) => {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    } else {
      done();
    }
  });

  test('starts and responds to /health', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.mode, 'test');
    assert.equal(typeof body.uptime, 'number');
  });

  test('responds to /api/greet', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/greet?name=Alice`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, 'Hello, Alice!');
    assert.equal(body.cached, false);
  });

  test('/api/greet uses cache on second call', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    await fetch(`http://127.0.0.1:${addr.port}/api/greet?name=Bob`);
    const res2 = await fetch(`http://127.0.0.1:${addr.port}/api/greet?name=Bob`);
    const body2 = await res2.json();
    assert.equal(body2.message, 'Hello, Bob!');
    assert.equal(body2.cached, true);
  });

  test('returns 404 for unknown routes', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/unknown`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Not found');
  });

  test('/api/greet defaults name to World', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/greet`);
    const body = await res.json();
    assert.equal(body.message, 'Hello, World!');
  });

  test('responses include CORS headers', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/health`);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.ok(res.headers.get('access-control-allow-methods'));
  });

  test('responds to /openapi.json with a valid OpenAPI 3.0.3 document', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/openapi.json`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/json'));
    const body = await res.json();
    assert.equal(body.openapi, '3.0.3');
    assert.equal(body.info.title, 'api-starter');
    assert.ok(body.paths['/health']);
    assert.ok(body.paths['/api/greet']);
    assert.ok(body.paths['/openapi.json']);
  });

  test('OPTIONS preflight returns 204', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/greet`, {
      method: 'OPTIONS',
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });

  test('returns 429 with Retry-After when the rate limit is exhausted', async () => {
    const result = startServer({
      config: {
        mode: 'test',
        port: 0,
        host: '127.0.0.1',
        rateLimit: { capacity: 2, refillPerSecond: 0.01 },
      },
    });
    server = result.server;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const r1 = await fetch(`http://127.0.0.1:${addr.port}/health`);
    const r2 = await fetch(`http://127.0.0.1:${addr.port}/health`);
    const r3 = await fetch(`http://127.0.0.1:${addr.port}/health`);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429);
    assert.ok(r3.headers.get('retry-after'));
    const body = await r3.json();
    assert.equal(body.error, 'Too Many Requests');
    assert.ok(typeof body.retryAfterMs === 'number' && body.retryAfterMs > 0);
  });

  test('/auth/oauth/start returns an authorization URL and records pending state', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/auth/oauth/start`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.provider, 'memory');
    assert.equal(typeof body.authorizationUrl, 'string');
    assert.ok(body.authorizationUrl.includes('code_challenge_method=S256'));
    assert.ok(body.authorizationUrl.includes(`state=${body.state}`));
    assert.equal(result.ctx.pendingOAuth.size, 1);
  });

  test('/auth/oauth/callback exchanges code and returns the user profile', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();

    const startRes = await fetch(`http://127.0.0.1:${addr.port}/auth/oauth/start`);
    const startBody = await startRes.json();

    const callbackUrl = `http://127.0.0.1:${addr.port}/auth/oauth/callback?code=xyz&state=${encodeURIComponent(
      startBody.state,
    )}`;
    const cbRes = await fetch(callbackUrl);
    assert.equal(cbRes.status, 200);
    const cbBody = await cbRes.json();
    assert.equal(cbBody.provider, 'memory');
    assert.equal(cbBody.user.id, 'memory:user-1');
    assert.equal(cbBody.user.role, 'user');
    // Pending state cleared.
    assert.equal(result.ctx.pendingOAuth.size, 0);
  });

  test('/auth/oauth/callback rejects unknown state as 500', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(
      `http://127.0.0.1:${addr.port}/auth/oauth/callback?code=x&state=not-there`,
    );
    assert.equal(res.status, 500);
  });

  test('/api/jobs/enqueue + /api/jobs + /api/jobs/run wires the job queue end-to-end', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const enq = await fetch(`${base}/api/jobs/enqueue?name=demo&x=1`);
    assert.equal(enq.status, 200);
    const enqBody = await enq.json();
    assert.equal(enqBody.name, 'demo');
    assert.equal(enqBody.status, 'pending');

    const listRes = await fetch(`${base}/api/jobs`);
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.total, 1);
    assert.equal(listBody.jobs[0].name, 'demo');

    const runRes = await fetch(`${base}/api/jobs/run`);
    assert.equal(runRes.status, 200);
    const runBody = await runRes.json();
    assert.equal(runBody.processed, 1);
    assert.equal(result.ctx.jobQueue.size('completed'), 1);
  });

  test('/api/email/send enqueues a send-email job and /api/jobs/run delivers it via the mailer', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const sendRes = await fetch(
      `${base}/api/email/send?to=alice@example.com&subject=Welcome&text=Hi`,
    );
    assert.equal(sendRes.status, 200);
    const sendBody = await sendRes.json();
    assert.equal(sendBody.status, 'pending');
    assert.equal(sendBody.to, 'alice@example.com');

    // Nothing delivered yet — the HTTP path only enqueues.
    assert.equal(result.ctx.mailer.list().length, 0);

    // Drain the worker; the send-email handler delivers via the mailer.
    const runRes = await fetch(`${base}/api/jobs/run`);
    assert.equal(runRes.status, 200);
    assert.equal((await runRes.json()).processed, 1);

    const listRes = await fetch(`${base}/api/email/list`);
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.total, 1);
    assert.equal(listBody.records[0].to[0], 'alice@example.com');
    assert.equal(listBody.records[0].subject, 'Welcome');
    assert.equal(result.ctx.mailer.list('sent').length, 1);
  });

  test('/api/search/query returns ranked hits against the seeded index', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const res = await fetch(`${base}/api/search/query?q=hexagonal`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.q, 'hexagonal');
    assert.ok(body.total >= 1);
    assert.ok(Array.isArray(body.hits));
    assert.ok(body.hits[0].highlights.title.includes('<mark>'));
  });

  test('/api/search/query honors the tag filter', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const res = await fetch(`${base}/api/search/query?q=hexagonal&tag=process`);
    assert.equal(res.status, 200);
    const body = await res.json();
    // Seed: "hexagonal" appears in arch/modules only, so process tag filters to 0.
    assert.equal(body.total, 0);
  });

  test('/api/payments/* walks through customer → intent → confirm', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const customerRes = await fetch(`${base}/api/payments/customer?email=alice@example.com`);
    assert.equal(customerRes.status, 200);
    const customer = await customerRes.json();
    assert.ok(customer.id.startsWith('cus_'));

    const intentRes = await fetch(
      `${base}/api/payments/intent?amount=1999&currency=USD&customerId=${customer.id}`,
    );
    assert.equal(intentRes.status, 200);
    const intent = await intentRes.json();
    assert.equal(intent.status, 'requires_payment_method');
    assert.deepEqual(intent.amount, { amount: 1999, currency: 'USD' });

    const confirmRes = await fetch(`${base}/api/payments/confirm?id=${intent.id}&pm=pm_card_visa`);
    assert.equal(confirmRes.status, 200);
    const confirmed = await confirmRes.json();
    assert.equal(confirmed.status, 'succeeded');

    const listRes = await fetch(`${base}/api/payments/list?status=succeeded`);
    const listBody = await listRes.json();
    assert.equal(listBody.total, 1);
    assert.equal(listBody.intents[0].id, intent.id);
  });

  test('/api/payments/confirm with pm_fail_* surfaces the failed branch', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const intentRes = await fetch(`${base}/api/payments/intent?amount=500&currency=USD`);
    const intent = await intentRes.json();
    const confirmRes = await fetch(
      `${base}/api/payments/confirm?id=${intent.id}&pm=pm_fail_declined`,
    );
    assert.equal(confirmRes.status, 200);
    const confirmed = await confirmRes.json();
    assert.equal(confirmed.status, 'failed');
  });

  test('/api/tenancy/* walks through create → get → list', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const createRes = await fetch(`${base}/api/tenancy/create?id=acme&name=Acme`);
    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    assert.equal(created.id, 'acme');
    assert.equal(created.name, 'Acme');

    const getRes = await fetch(`${base}/api/tenancy/get?id=acme`);
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.found, true);
    assert.equal(getBody.tenant.id, 'acme');

    const listRes = await fetch(`${base}/api/tenancy/list`);
    const listBody = await listRes.json();
    assert.equal(listBody.total, 1);
    assert.equal(listBody.tenants[0].id, 'acme');
  });

  test('/api/cqrs/dispatch → /api/cqrs/ask walks the Counter round-trip and /api/cqrs/events lists recorded events', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const base = `http://127.0.0.1:${addr.port}`;

    const d1 = await fetch(`${base}/api/cqrs/dispatch?type=Counter.Increment&by=2`);
    assert.equal(d1.status, 200);
    const d2 = await fetch(`${base}/api/cqrs/dispatch?type=Counter.Increment&by=5`);
    assert.equal(d2.status, 200);

    const askRes = await fetch(`${base}/api/cqrs/ask?type=Counter.Get`);
    assert.equal(askRes.status, 200);
    const askBody = await askRes.json();
    assert.equal(askBody.ok, true);
    assert.deepEqual(askBody.result, { total: 7 });

    const eventsRes = await fetch(`${base}/api/cqrs/events`);
    const eventsBody = await eventsRes.json();
    assert.equal(eventsBody.total, 2);
    assert.equal(eventsBody.events[0].type, 'Counter.Incremented');
    assert.equal(eventsBody.events[0].sequence, 1);
  });

  test('/api/email/send rejects invalid recipients as 500 at the boundary', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(
      `http://127.0.0.1:${addr.port}/api/email/send?to=not-an-email&subject=hi&text=body`,
    );
    assert.equal(res.status, 500);
  });

  test('/manifest.webmanifest returns the W3C manifest JSON with correct content type', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/manifest.webmanifest`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/manifest+json'));
    const body = await res.json();
    assert.equal(body.name, 'Contextrail API Starter');
    assert.equal(body.short_name, 'Contextrail');
    assert.equal(body.start_url, '/');
    assert.equal(body.display, 'standalone');
    assert.ok(Array.isArray(body.icons));
  });

  test('/sw.js returns generated service worker source with correct content type', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/sw.js`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/javascript'));
    const text = await res.text();
    assert.ok(text.includes("addEventListener('install'"));
    assert.ok(text.includes("addEventListener('fetch'"));
    assert.ok(text.includes('api-starter-v1'));
  });

  test('/sitemap.xml returns valid sitemap XML', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/sitemap.xml`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('application/xml'));
    const text = await res.text();
    assert.ok(text.startsWith('<?xml'));
    assert.ok(text.includes('<urlset'));
    assert.ok(text.includes('<loc>https://example.com/</loc>'));
  });

  test('/robots.txt returns plain-text robots directives', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/robots.txt`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/plain'));
    const text = await res.text();
    assert.ok(text.includes('User-agent: *'));
    assert.ok(text.includes('Disallow: /admin/'));
    assert.ok(text.includes('Sitemap: https://example.com/sitemap.xml'));
  });

  test('/api/seo/meta returns rendered meta tag HTML as JSON', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/seo/meta?page=home`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.page, 'home');
    assert.ok(body.html.includes('<title>Contextrail API Starter — Home</title>'));
    assert.ok(body.html.includes('<link rel="canonical"'));
  });

  test('/api/theme/tokens returns rendered CSS variables for the requested scheme', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/theme/tokens?scheme=dark`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.scheme, 'dark');
    assert.ok(body.css.startsWith(':root {'));
    assert.ok(body.css.includes('--color-bg: #0b1220;'));
    assert.ok(body.css.includes('--color-accent: #38bdf8;'));
  });

  test('/api/theme/preference/set persists and /api/theme/preference reads back', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();

    const initial = await fetch(`http://127.0.0.1:${addr.port}/api/theme/preference?user=alice`);
    const initialBody = await initial.json();
    assert.equal(initialBody.stored, false);

    const setRes = await fetch(
      `http://127.0.0.1:${addr.port}/api/theme/preference/set?user=alice&scheme=dark`,
    );
    const setBody = await setRes.json();
    assert.equal(setBody.stored, true);
    assert.equal(setBody.preference.scheme, 'dark');

    const getRes = await fetch(`http://127.0.0.1:${addr.port}/api/theme/preference?user=alice`);
    const getBody = await getRes.json();
    assert.equal(getBody.stored, true);
    assert.equal(getBody.preference.scheme, 'dark');
  });

  test('/api/theme/preference/set rejects an invalid scheme', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(
      `http://127.0.0.1:${addr.port}/api/theme/preference/set?user=alice&scheme=sepia`,
    );
    const body = await res.json();
    assert.ok(body.error);
  });

  test('/api/graphql executes the default `{ hello }` query against the demo schema', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/graphql`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.query, '{ hello }');
    assert.deepEqual(body.data, { hello: 'Hello, world!' });
    assert.deepEqual(body.errors, []);
  });

  test('/api/graphql executes a custom query with a scalar argument and nested selection', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const query = encodeURIComponent('{ greeting(name: "Alice") me { id name } }');
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/graphql?query=${query}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.greeting, 'Hello, Alice!');
    assert.deepEqual(body.data.me, { id: '42', name: 'Ada Lovelace' });
  });

  test('/api/graphql surfaces parse errors in the result envelope', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const query = encodeURIComponent('{ ...Frag }');
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/graphql?query=${query}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data, null);
    assert.ok(Array.isArray(body.errors) && body.errors.length > 0);
  });

  test('/api/prerender/run renders the demo manifest and stores HTML in memory', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/prerender/run`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.baseUrl, 'https://example.com');
    assert.ok(Array.isArray(body.rendered));
    assert.equal(body.rendered.length, 3);
    assert.equal(body.failed.length, 0);
    assert.equal(body.stored, 3);
    assert.ok(body.durationMs >= 0);
    const paths = body.rendered.map((r) => r.path).sort();
    assert.deepEqual(paths, ['/api/greet?name=World', '/health', '/openapi.json']);
  });

  test('/api/prerender/output returns the stored HTML for a rendered path', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    // Prime the output by running the pass first.
    await fetch(`http://127.0.0.1:${addr.port}/api/prerender/run`);
    const res = await fetch(
      `http://127.0.0.1:${addr.port}/api/prerender/output?path=${encodeURIComponent('/health')}`,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.path, '/health');
    assert.ok(body.html.startsWith('<!doctype html>'));
    assert.ok(body.html.includes('<title>/health</title>'));
  });

  test('/api/prerender/output returns an error envelope for an unknown path', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;
    await new Promise((resolve) => server.on('listening', resolve));
    const addr = server.address();
    await fetch(`http://127.0.0.1:${addr.port}/api/prerender/run`);
    const res = await fetch(
      `http://127.0.0.1:${addr.port}/api/prerender/output?path=${encodeURIComponent('/nope')}`,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('async handler errors return 500', async () => {
    const result = startServer({ config: { mode: 'test', port: 0, host: '127.0.0.1' } });
    server = result.server;

    // Temporarily break the context to force a handler error
    result.ctx.cache = null;

    await new Promise((resolve) => server.on('listening', resolve));

    const addr = server.address();
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/greet?name=Crash`);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'Internal server error');
  });
});
