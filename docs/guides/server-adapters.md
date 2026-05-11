<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for wiring server-side hex adapters in Node.js applications.
@sidecar server-adapters.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Server-side adapter examples

This guide shows how to wire hex module adapters for a Node.js server application. Every adapter follows the same pattern: import the factory from the module's `public-api.mjs`, call it with injected dependencies, and pass the result to your app's DI layer.

## Pattern overview

```
Port (interface)  <--  Adapter (factory)  <--  External dependency (injected)
```

Adapters never own their external dependency directly. The dependency is injected at creation time, keeping each adapter testable and swappable.

## Auth: server-side sessions

The `auth` module ships a `createServerSessionAdapter` that stores sessions in memory by default. Inject a Redis-backed store for production.

```javascript
import { createServerSessionAdapter } from 'modules/auth/public-api.mjs';

// 1. Define a credential verifier (your app owns this)
const verifier = {
  async verify({ username, password }) {
    const user = await db.findUserByUsername(username);
    if (!user || !await bcrypt.compare(password, user.passwordHash)) return null;
    return { id: user.id, name: user.name, role: user.role };
  },
};

// 2. Wire the adapter
const auth = createServerSessionAdapter({ verifier });

// 3. Use in Express middleware
app.post('/login', async (req, res) => {
  const result = await auth.login(req.body);
  if (result.success) {
    res.cookie('session', result.user.accessToken, { httpOnly: true });
    res.json({ user: result.user });
  } else {
    res.status(401).json({ error: result.error });
  }
});
```

For production, inject an external session store (e.g. Redis):

```javascript
const redisStore = {
  get(id) { return redisClient.get(`session:${id}`).then(JSON.parse); },
  set(id, user) { redisClient.set(`session:${id}`, JSON.stringify(user), 'EX', 3600); },
  delete(id) { return redisClient.del(`session:${id}`); },
};

const auth = createServerSessionAdapter({ verifier, store: redisStore });
```

## Cache: Redis adapter

The `cache` module provides `createRedisCacheAdapter`. Inject any Redis client that exposes `{ get, set, del, exists, keys, dbsize, pexpire }` (ioredis, node-redis v4+).

```javascript
import { createRedisCacheAdapter } from 'modules/cache/public-api.mjs';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);

const cache = createRedisCacheAdapter({
  client: redisClient,
  namespace: 'api',
  maxEntries: 10_000,
  defaultTtl: 60_000, // 60 seconds
});

// Read-through cache pattern
async function getCachedUser(userId) {
  const cached = cache.get(`user:${userId}`);
  if (cached) return cached;

  const user = await db.findUser(userId);
  cache.set(`user:${userId}`, user);
  return user;
}
```

## Database: node:sqlite adapter

The `db` module includes `createNodeSqliteAdapter` for zero-dependency SQLite on Node >= 22.5. For older Node or other databases, use `createSqlDriverAdapter` with an injected driver.

```javascript
import { createNodeSqliteAdapter } from 'modules/db/public-api.mjs';

// Zero-dependency SQLite (Node >= 22.5)
const db = createNodeSqliteAdapter({ filename: './data/app.db' });

// Or inject any SQL driver (better-sqlite3, pg, mysql2, ...)
import { createSqlDriverAdapter } from 'modules/db/public-api.mjs';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = createSqlDriverAdapter({ driver: pool });
```

## Realtime: WebSocket server transport

The `realtime` module ships a `createWsServerTransport` for server-side WebSocket connections. It wraps an incoming connection — no hard dependency on any WS library.

```javascript
import { createWsServerTransport } from 'modules/realtime/public-api.mjs';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (socket) => {
  const transport = createWsServerTransport();

  // Pass the incoming connection object
  transport.open('', { connection: socket }).then(() => {
    transport.onMessage((data) => {
      console.log('Received:', data);
      transport.send({ echo: data });
    });
  });
});
```

## Tenancy: AsyncLocalStorage context

The `tenancy` module uses `createAlsTenantContext` to scope a tenant across an entire async call graph using Node's `AsyncLocalStorage`.

```javascript
import { createAlsTenantContext } from 'modules/tenancy/public-api.mjs';

const tenantCtx = createAlsTenantContext();

// Express middleware: bind tenant per request
app.use(async (req, _res, next) => {
  const tenant = await resolveTenant(req.headers['x-tenant-id']);
  tenantCtx.run(tenant, () => next());
});

// Anywhere downstream — no need to thread tenant through arguments
app.get('/api/data', async (_req, res) => {
  const tenant = tenantCtx.require(); // throws if outside a run
  const data = await fetchDataForTenant(tenant.id);
  res.json(data);
});
```

## Log: structured JSON adapter

The `log` module provides `createStructuredJsonAdapter` for production-grade structured logging.

```javascript
import { createStructuredJsonAdapter } from 'modules/log/public-api.mjs';

const logger = createStructuredJsonAdapter({
  level: process.env.LOG_LEVEL || 'info',
});

// Outputs: {"level":"info","msg":"Server started","port":3000,"ts":"..."}
logger.info('Server started', { port: 3000 });
```

## Monitoring: memory adapter for tests

All server modules ship a memory/no-op adapter for testing. No Redis, no database, no network needed.

```javascript
import { createMemoryMonitoringAdapter } from 'modules/monitoring/public-api.mjs';
import { createMemoryDatabaseAdapter } from 'modules/db/public-api.mjs';
import { createMemorySessionStore } from 'modules/auth/public-api.mjs';

// Wire the full app with in-memory adapters for integration tests
const deps = {
  db: createMemoryDatabaseAdapter(),
  monitoring: createMemoryMonitoringAdapter(),
  // ... all modules have a memory adapter
};
```

## Full wiring example

A typical `apps/api-starter/di.mjs` wires everything together:

```javascript
import { createServerSessionAdapter } from 'modules/auth/public-api.mjs';
import { createRedisCacheAdapter } from 'modules/cache/public-api.mjs';
import { createNodeSqliteAdapter } from 'modules/db/public-api.mjs';
import { createStructuredJsonAdapter } from 'modules/log/public-api.mjs';
import { createAlsTenantContext } from 'modules/tenancy/public-api.mjs';

export function createDependencies(config) {
  const log = createStructuredJsonAdapter({ level: config.logLevel });
  const db = createNodeSqliteAdapter({ filename: config.dbPath });
  const cache = createRedisCacheAdapter({ client: config.redisClient, namespace: 'api' });
  const tenantCtx = createAlsTenantContext();
  const auth = createServerSessionAdapter({ verifier: config.verifier });

  return { log, db, cache, tenantCtx, auth };
}
```

Each adapter is created once, injected into the app, and used through the port interface. Swapping an adapter (e.g. SQLite to PostgreSQL) means changing one line in `di.mjs` — no other code changes.

## What NOT to do

- **Don't import adapters directly in domain or port layers.** Adapters are wired at the app/DI boundary only.
- **Don't hardcode connection strings in adapters.** Inject configuration via the factory options.
- **Don't create server-specific adapters inside `modules/*/domain/`.** Domain must stay runtime-agnostic.
- **Don't skip the memory adapter in tests.** Every module provides one — use it instead of mocking the port interface.
