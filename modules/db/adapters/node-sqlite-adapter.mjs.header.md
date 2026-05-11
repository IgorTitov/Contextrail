---
fileId: contextrail-template:modules:db:adapters:node-sqlite-adapter
module: modules/db
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: db
summary: "Real-database adapter using Node's built-in node:sqlite — zero npm deps, satisfies DatabasePort."
owns: The node:sqlite-backed implementation of DatabasePort, including its lazy load + experimental-warning suppression and BEGIN/COMMIT/ROLLBACK transaction wiring.
boundaries: Server-side only. Requires Node ≥22.5 at the moment the factory is called; importing this file on older Node is safe and only the createNodeSqliteAdapter call throws a friendly error.
invariants: Must pass assertDatabasePort. Must not pull node:sqlite at module load time — only inside loadNodeSqlite() — so public-api.mjs stays importable on the global engine floor (Node ≥18.18). Lazy load must remove its temporary process.emitWarning override even on failure.
risks: node:sqlite is still flagged "experimental" upstream; any breaking change in Node 22.x/23.x may require pinning the lazy loader. The experimental warning is silenced on first load only — if the warning text upstream changes, the silencer becomes a no-op rather than breaking.
securityPrivacy: SQL parameters are bound positionally via prepared statements (StatementSync.all/run), never string-interpolated. Connections opened in read-only mode when options.readOnly is true.
notesForLLM: Use for the canonical "real DB" example in this template. For tests that target older Node, fall back to createMemoryDatabaseAdapter.
allowedDependencies:
  - "../ports/*"
  - "node:module"
  - "node:sqlite (lazy via createRequire)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/**"
adapterType: real-database
implementsPort: database-port
transport: db/sql
runtimeEnvironment: server
linkedDocs:
  - modules/db/adapters/README.md
  - modules/db/README.md
specRefs:
  - TPL-001
---

# node-sqlite-adapter.mjs
