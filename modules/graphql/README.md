<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the graphql hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx graphql
@public false
@edit careful -->

# graphql

Hexagonal GraphQL module — a pure `Schema` value object with type/field/resolver validation, a minimal subset query parser (no external `graphql-js` dependency), a pure executor that walks the AST and aggregates errors, a `GraphqlTransportPort` for wiring the parser+executor into any transport, and a zero-dependency in-memory adapter for tests and dev. Zero external dependencies and zero Node builtins.

## Why

Real GraphQL servers pull in a full `graphql-js` runtime, a schema-definition-language parser, a validation pass, and usually a server framework (`apollo-server`, `graphql-yoga`, `mercurius`). That is overkill when what you actually need is a demonstrable contract module that speaks the same `{ data, errors }` shape, lets you prototype resolvers, and stays friendly to COA navigation.

This module is intentionally **not** a full GraphQL server. It implements a closed, documented subset of the query grammar — enough to run `{ hello greeting(name: "Alice") }` against a schema with typed fields and resolvers — and wraps that behind a 1-method port so any transport (HTTP, WebSocket, IPC) can adopt it without touching the pure domain. Real deployments swap the adapter for one that speaks their transport while reusing the same parser + executor.

## Supported query subset

Supported:

- optional `query { ... }` or `mutation { ... }` wrapper
- anonymous `{ ... }` selection set
- named fields with nested selection sets
- literal scalar arguments: `String` `"..."`, `Int` / `Float` (including negatives and decimals), `Boolean` `true` / `false`
- line comments `# ...`
- comma-or-whitespace-separated field and argument lists

Explicitly **not** supported (rejected with a clear, subset-specific error):

- fragments `... on Type` and `...FragName`
- variables `$name`
- directives `@skip` / `@include`
- aliases `alias: field`
- input-object literal arguments `{ key: value }`
- list literal arguments `[1, 2, 3]`

If a consumer needs full grammar coverage, they should replace the adapter with one backed by a real GraphQL runtime while keeping the same port contract.

## Structure

```text
modules/graphql/
├── domain/
│   ├── schema.mjs                # createSchema + stripTypeDecoration + isBuiltinScalar
│   ├── query-parser.mjs          # parseQuery (minimal recursive-descent subset)
│   └── executor.mjs              # executeQuery (pure walk + error aggregation)
├── ports/
│   └── graphql-transport-port.mjs  # GraphqlTransportPort + assertGraphqlTransportPort
├── adapters/
│   └── memory-graphql-transport.mjs  # In-memory transport (parse + execute in one call)
├── public-api.mjs                # Cross-module entry point
├── messages.mjs                  # i18n keys (graphql.*)
├── manifest.json                 # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                                |
| ------------ | ---------------- | ------------------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O, no transport, no `node:*` imports.          |
| **Ports**    | `ports/`         | `GraphqlTransportPort` contract (1 method).                         |
| **Adapters** | `adapters/`      | In-memory transport wrapping the pure parser + executor.            |
| **Public**   | `public-api.mjs` | The only file other modules may import.                             |

## Usage

### Declare a schema and execute a query

```javascript
import {
  createSchema,
  parseQuery,
  executeQuery,
} from './modules/graphql/public-api.mjs';

const schema = createSchema({
  types: {},
  queries: {
    hello: {
      type: 'String',
      resolver: () => 'Hello, world!',
    },
    greeting: {
      type: 'String',
      resolver: (_parent, args) => `Hello, ${args.name}!`,
    },
  },
});

const ast = parseQuery('{ hello greeting(name: "Alice") }');
const result = await executeQuery(schema, ast);
// → { data: { hello: 'Hello, world!', greeting: 'Hello, Alice!' }, errors: [] }
```

### Wire it behind a transport

```javascript
import {
  createSchema,
  createMemoryGraphqlTransport,
  assertGraphqlTransportPort,
} from './modules/graphql/public-api.mjs';

const schema = createSchema({
  types: {},
  queries: { hello: { type: 'String', resolver: () => 'hi' } },
});

const transport = createMemoryGraphqlTransport({ schema });
assertGraphqlTransportPort(transport);

const result = await transport.handleQuery('{ hello }');
// → { data: { hello: 'hi' }, errors: [] }
```

## Rules

- Domain is pure. No transport, no framework, no `node:*` imports.
- Resolvers may throw — the executor catches and aggregates failures into `result.errors` with the field path. `data` for the failed field becomes `null`.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/graphql.test.mjs` — proves schema validation (unknown type refs, invalid fields, invalid resolvers), the documented parser subset (field names, nested selections, string/number/boolean args), explicit rejection of fragments/variables/directives, executor happy path, resolver error aggregation, transport adapter round-trip including a parse-error surfacing as `errors`.
- `tests/contract/graphql-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
