<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the db hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx db
@public false
@edit careful -->

# db

Hexagonal bounded module for database access with pluggable adapters.

## Port contract

| Method        | Signature                                           | Description                  |
| ------------- | --------------------------------------------------- | ---------------------------- |
| `query`       | `(sql: string, params?: unknown[]) => QueryResult`  | Execute a read query         |
| `execute`     | `(sql: string, params?: unknown[]) => QueryResult`  | Execute a write statement    |
| `transaction` | `(fn: (tx) => void) => void`                        | Run operations in a block    |
| `close`       | `() => void`                                        | Close the connection         |

## Adapters

| Adapter                       | Module                             | Description                                                        |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `createMemoryDatabaseAdapter` | `adapters/memory-adapter.mjs`      | In-memory table store for testing                                  |
| `createSqlDriverAdapter`      | `adapters/sql-driver-adapter.mjs`  | Wraps any injected SQL driver                                      |
| `createNodeSqliteAdapter`     | `adapters/node-sqlite-adapter.mjs` | Real SQLite via built-in `node:sqlite` (Node ≥22.5, zero npm deps) |

## Domain

- `createQueryBuilder(table)` — simple fluent query builder (select/where/orderBy/limit/offset)

## Usage

```js
import {
  createMemoryDatabaseAdapter,
  createQueryBuilder,
  assertDatabasePort,
} from '../../modules/db/public-api.mjs';

const db = createMemoryDatabaseAdapter();
assertDatabasePort(db);

db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT, name TEXT, age INTEGER)');
db.execute('INSERT INTO users (id, name, age) VALUES (?, ?, ?)', ['u1', 'Alice', 30]);

const { sql, params } = createQueryBuilder('users')
  .select('name', 'age')
  .where('age > ?', 25)
  .orderBy('name')
  .limit(10)
  .build();

const result = db.query(sql, params);
```

## Real SQLite (zero-dependency)

For a ready-to-run real database without adding any npm dependency, use
`createNodeSqliteAdapter`. It is backed by Node's built-in `node:sqlite` module
and requires Node ≥22.5 (the rest of the template still runs on Node ≥18.18).

```js
import {
  createNodeSqliteAdapter,
  assertDatabasePort,
} from '../../modules/db/public-api.mjs';

const db = createNodeSqliteAdapter({ location: './data/app.sqlite' });
assertDatabasePort(db);

db.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');
db.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

db.transaction((tx) => {
  tx.execute('INSERT INTO users (name) VALUES (?)', ['Bob']);
  tx.execute('INSERT INTO users (name) VALUES (?)', ['Carol']);
});

const { rows } = db.query('SELECT name FROM users ORDER BY id');
db.close();
```

Pass `{ location: ':memory:' }` (the default) for an ephemeral database, or
omit the option entirely. To swap to Postgres / MySQL, use `createSqlDriverAdapter`
with the relevant driver instead.

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- The SQL driver adapter accepts any driver via injection — no hard dependencies.
- The node:sqlite adapter requires Node ≥22.5 at the moment the factory is called;
  importing `public-api.mjs` on older Node remains safe.
