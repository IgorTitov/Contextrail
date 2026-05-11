<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for communication patterns between Contextrail-based applications via REST, GraphQL, and WebSocket.
@sidecar inter-app-api.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Inter-App API Patterns

When you have multiple Contextrail-based applications that need to
communicate, the hex architecture provides a clean pattern: each app
defines its own ports, and communication happens through adapters.

See [ADR-0013](../adr/0013-inter-app-communication.md) for the
architectural decision.

---

## The rule

**Applications never import each other's modules.** Communication
always crosses a network boundary through adapters.

```
┌─ App A (MedOps) ─────────────────┐     ┌─ App B (Cockpit) ─────────────────┐
│                                   │     │                                    │
│  domain/patient-scoring.mjs       │     │  domain/dashboard-logic.mjs        │
│         │                         │     │         │                          │
│  ports/scoring-port.mjs           │     │  ports/data-source-port.mjs        │
│         │                         │     │         │                          │
│  adapters/                        │     │  adapters/                         │
│    rest-scoring-api.mjs ──────────┼─────┼──→ rest-scoring-client.mjs         │
│    (serves POST /api/scores)      │ HTTP│    (calls MedOps /api/scores)      │
│                                   │     │                                    │
└───────────────────────────────────┘     └────────────────────────────────────┘
```

## Pattern 1: REST (request/response)

Use the existing `api-client` and `openapi` modules.

### Server side (App A)

```js
// modules/scoring/adapters/rest-scoring-api.mjs
import { calculateScore } from '../domain/patient-scoring.mjs';

export function scoringRoutes() {
  return {
    'POST /api/scores': async (req) => {
      const { patientId, metrics } = req.body;
      const score = calculateScore(patientId, metrics);
      return { status: 200, body: score };
    },
    'GET /api/scores/:id': async (req) => {
      // ...
    },
  };
}
```

Wire into `apps/api-starter/` or your app's server.

### Client side (App B)

```js
// modules/dashboard/adapters/rest-scoring-client.mjs
import { createFetchAdapter } from '../../api-client/public-api.mjs';

const api = createFetchAdapter({ baseUrl: 'https://medops.example.com' });

export function createRestScoringClient() {
  return {
    async calculateScore(patientId, metrics) {
      const res = await api.post('/api/scores', { patientId, metrics });
      return res.body;
    },
  };
}
```

This adapter implements App B's `data-source-port` — the domain
layer doesn't know or care that data comes from another app.

### OpenAPI spec

```js
// Generate spec for App A's API
import { buildOpenApiDocument } from '../../openapi/public-api.mjs';

const spec = buildOpenApiDocument({
  title: 'MedOps Scoring API',
  version: '1.0.0',
  paths: {
    '/api/scores': { post: { /* ... */ } },
  },
});
```

## Pattern 2: GraphQL (query language)

Use the existing `graphql` module for a lightweight query API.

```js
// modules/scoring/adapters/graphql-scoring-schema.mjs
import { createSchema, parseQuery, executeQuery } from '../../graphql/public-api.mjs';
import { calculateScore, getHistory } from '../domain/patient-scoring.mjs';

const schema = createSchema(`
  type Score { patientId: String, value: Float, timestamp: String }
  type Query { score(id: String!): Score, history(id: String!): [Score] }
`);

export function handleGraphQL(query, variables) {
  const ast = parseQuery(query);
  return executeQuery(schema, ast, {
    score: ({ id }) => calculateScore(id),
    history: ({ id }) => getHistory(id),
  });
}
```

## Pattern 3: Real-time (WebSocket / SSE)

Use the existing `realtime` module for streaming communication.

```js
// App A: publish events
import { createWebSocketTransport } from '../../realtime/public-api.mjs';

const ws = createWebSocketTransport({ url: 'ws://localhost:8080' });
// Domain events → WebSocket messages
eventBus.on('score-updated', (data) => ws.send(JSON.stringify(data)));

// App B: subscribe to events
import { createWebSocketTransport } from '../../realtime/public-api.mjs';

const ws = createWebSocketTransport({ url: 'ws://medops:8080' });
ws.onMessage((msg) => {
  const event = JSON.parse(msg);
  dashboardPort.updateScore(event);
});
```

## Pattern 4: MCP (AI agent access)

See the dedicated [MCP Integration Guide](mcp-integration.md).

## Choosing a pattern

| Pattern | When to use | Existing module |
|---------|------------|-----------------|
| **REST** | Standard CRUD, request/response | `api-client`, `openapi` |
| **GraphQL** | Flexible queries, multiple consumers | `graphql` |
| **WebSocket/SSE** | Real-time updates, streaming | `realtime` |
| **MCP** | AI agent access to app data/tools | (adapter pattern) |
| **Event bus** | In-process pub/sub (same app) | `event-bus` |

## Testing inter-app communication

| Layer | What to test | How |
|-------|-------------|-----|
| **Domain** | Business logic | Unit test with memory adapter |
| **Adapter contract** | Server adapter implements port correctly | Contract test against port interface |
| **Integration** | Client adapter calls server adapter | Integration test with localhost server |
| **E2E** | Full app-to-app flow | Playwright or HTTP test against both running apps |

```js
// tests/integration/scoring-api.test.mjs
import { scoringRoutes } from '../../modules/scoring/adapters/rest-scoring-api.mjs';
import { createRestScoringClient } from '../../modules/dashboard/adapters/rest-scoring-client.mjs';

test('client can call server scoring API', async () => {
  const server = await startTestServer(scoringRoutes());
  const client = createRestScoringClient({ baseUrl: server.url });
  const score = await client.calculateScore('patient-1', { bp: 120 });
  assert.ok(score.value > 0);
  await server.close();
});
```

## What the template provides vs what you build

| Template provides | You build |
|------------------|-----------|
| `api-client` port + fetch adapter | Your API client adapters |
| `openapi` document builder | Your API spec |
| `graphql` schema + executor | Your schema + resolvers |
| `realtime` transports (WS, SSE) | Your event routing |
| `event-bus` pub/sub | Your event handlers |
| `apps/api-starter` reference server | Your app server |
| MCP adapter pattern (in guide) | Your MCP resources + tools |

---

**Related:**
- [ADR-0013](../adr/0013-inter-app-communication.md) — decision record
- [MCP Integration](mcp-integration.md) — exposing modules to AI agents
- [Server Adapters](server-adapters.md) — server-side adapter wiring
- [Framework in Hex Modules](framework-in-hex-modules.md) — adapter layer patterns
