<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document 0009-sidecar-first-headers for this repository.
@sidecar 0009-sidecar-first-headers.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0009 — Sidecar-first headers

## Status

Accepted

## Context

ADR-0006 (COA) established that every file carries structured metadata so agents can navigate without reading implementation. The current header format places all metadata inline — 51 lines of structured fields per file, regardless of file size.

Measured impact across 837 files with inline headers:

| File size | Header | Ratio |
|-----------|--------|-------|
| 56 lines  | 51     | 91%   |
| 80 lines  | 51     | 64%   |
| 120 lines | 51     | 43%   |
| 500+ lines| 51     | <10%  |

ADR-0006 itself listed "Header verbosity — ~50-90 lines of metadata per file" as a negative consequence. In practice:

- **Token waste.** An agent reading 10 files loads ~510 header lines before seeing any code. In a 4K-8K window this is 25-50% of the budget — spent on `_none_` fields.
- **Diff noise.** Version bumps and changelog entries pollute code diffs. Reviewers must scroll past metadata to see the real change.
- **Merge conflicts.** Parallel agents editing the same file conflict in the header zone (version, changelog) even when their code changes are independent.
- **Split mechanism.** JSON, SVG, and binary files already require `.header.md` sidecars (41 files today). Two metadata mechanisms instead of one.
- **Placeholder waste.** 20+ fields with `_none_` carry zero information for the agent but cost tokens.

## Decision

Adopt **sidecar-first headers**: a slim inline pointer (7 lines) plus a sparse `.header.md` sidecar for full metadata.

### Slim inline header

```
/* @HEADER
 * @version 0.4.0 | 2026-04-06
 * @purpose Task Lifecycle domain logic for the task module.
 * @sidecar task-lifecycle.mjs.header.md
 * @layer module | @hex domain | @ctx task
 * @public false
 * @edit careful
 */
```

Seven fields survive inline. Each earns its place by being needed **before** the agent reads the sidecar or the code body:

| Field | Why inline |
|-------|-----------|
| `@version` | Drift detection, git blame, version checks — without opening a second file |
| `@purpose` | One-line summary — agent immediately understands the file's role |
| `@sidecar` | Explicit link to full metadata; grep-friendly; survives renames when convention alone would not |
| `@layer` / `@hex` / `@ctx` | Navigation triple (repo layer, hex layer, bounded context) in one line — architecture checks parse inline, no markdown needed |
| `@public` | Import guard rail — hex enforcement must know "can I import this?" without reading the sidecar |
| `@edit` | Agent behavior guard rail — careful/rewrite-ok/append-only determines *how* to edit before reading the body |

### Sparse sidecar format

The `.header.md` sidecar contains **all fields in YAML frontmatter** — both machine and narrative:

```markdown
---
fileId: contextrail-template:modules:task:domain:task-lifecycle
module: modules/task
stability: evolving
steward: shared
hexLayer: domain
boundedContext: task
summary: Core Task Lifecycle domain logic for the task module.
owns: Pure domain entity and lifecycle transitions.
boundaries: Pure domain logic. No infrastructure dependencies allowed.
invariants: Must remain framework-free and testable in isolation.
notesForLLM: Core domain logic. Test in isolation without adapters.
tests: tests/unit/task.test.mjs
---

# task-lifecycle.mjs
```

Key properties:
- **Sparse**: only present fields appear. No `_none_` padding.
- **All-YAML frontmatter**: every field is in YAML — one parser, strict boundaries, no regex body parsing.
- **camelCase keys**: machine fields (`fileId`, `hexLayer`) and narrative fields (`owns`, `boundaries`, `notesForLLM`) use consistent camelCase.
- **List fields as YAML arrays**: `dependsOn`, `tests`, `linkedDocs`, `related`, `specRefs`, etc. are proper YAML arrays when multi-valued.
- **Markdown body**: decorative only — just `# filename`. Not parsed by tools.
- **Unified**: same format for all file types — `.mjs`, `.json`, `.svg`, `.env`, binary.
- **GitHub rendering**: `.md` extension means GitHub renders frontmatter as a table and the heading as formatted text.
- **No changelog in sidecars**: `CHANGELOG.md` via `changelog-sync.mjs` is the single source for change history. Sidecars carry only structural and semantic metadata, not temporal changelog entries.

### Files that cannot receive inline comments

For JSON, SVG, images, and other comment-unsafe formats: sidecar-only (no inline header). This is already the current behavior — sidecar-first makes it the default rather than the exception.

### Migration path

The old (heavy inline) format remains parseable during migration. Scripts accept both formats. The migration script converts mechanically: parse old header, emit slim inline + sparse sidecar.

## Consequences

### Positive

- **Token budget recovered.** ~44 lines saved per file. Across 10 files in a session: ~440 lines (~1100 tokens) returned to the agent for actual code.
- **ADR-0006 negative resolved.** "Header verbosity" is no longer a consequence of COA.
- **Unified mechanism.** One metadata format for all file types instead of two.
- **Cleaner diffs.** Code changes and metadata changes live in separate files.
- **Fewer merge conflicts.** Parallel agents touch code and metadata independently.
- **Sparse format eliminates `_none_` waste.** Sidecar size is proportional to information content.
- **Easier schema evolution.** Changing the sidecar format does not require touching every source file.

### Negative

- **File count increases.** Every meaningful file gets a `.header.md` companion. ~837 new sidecar files.
- **Two reads instead of one.** Agent must `Read file` + `Read file.header.md` when full metadata is needed.
- **Drift risk.** File renamed, sidecar forgotten. Mitigated by `header-check.mjs` enforcing pair integrity.
- **Git blame split.** Metadata history is in the sidecar; code history is in the source file.

### Mitigations

- `header-check.mjs` validates slim header presence, sidecar existence, and field consistency.
- `header-migrate.mjs` performs deterministic, reversible, `--dry-run`-capable bulk conversion.
- `.gitattributes` can mark `*.header.md` as linguist-generated to reduce GitHub diff noise.
- Agent context loading protocols already distinguish "navigation reads" (cheap) from "implementation reads" (deep) — sidecars fit naturally into navigation reads.

## Amendment: `transport` field (v0.6.4)

Adapter-layer sidecars may include an optional `transport:` field
declaring the communication protocol the adapter uses:

```yaml
transport: http/rest
```

**Controlled vocabulary:** `http/rest`, `http/graphql`, `websocket`,
`sse`, `grpc`, `webrtc`, `amqp`, `kafka`, `mqtt`, `redis-pubsub`,
`cli`, `stdio`, `ipc`, `cron`, `file`, `db/sql`, `db/nosql`, `db/kv`,
`tcp`, `udp`

**Scope:** Only on adapter-layer files (`@hex adapter`). Domain and
port files must not declare transport — that would violate hex
principles. Use cases: architecture visualization (Cockpit), code
generation, test tooling selection, security audit, dependency
validation. See ADR-0013 for the inter-app communication context.

Memory/test adapters with no external communication do not need
`transport:`.

## Amendment: `*.help.md` user-facing sidecar (v0.6.5)

`*.header.md` sidecars serve **developers** (architecture, API,
dependencies). A parallel `*.help.md` sidecar serves **end users**
(what the UI element does, how to use it, when to use it).

### Format

```yaml
---
feature: board-settings
screen: kanban
element: gear-icon
trigger: click on gear icon in board header
---
# Board Settings

Click the gear icon in the board header to open settings.
```

### Convention

- **Co-located:** `Feature.help.md` lives next to `Feature.tsx` (or
  `.mjs`, `.vue`, `.svelte`), same as `Feature.header.md`.
- **Optional:** not every file needs a help sidecar. Only user-facing
  UI elements that are non-obvious (icon-only actions, hidden behaviors,
  configuration panels).
- **Assembled:** `scripts/checks/compile-user-guide.mjs` scans all
  `*.help.md` files, groups by `screen:` frontmatter, and generates
  `docs/user-guide.md`. Run on demand.
- **Three categories:** Obvious elements (text buttons, standard
  patterns) need no help. Non-obvious (icon-only, double-click,
  hidden config) get `*.help.md` + contextual tooltip. Hidden
  (keyboard shortcuts, cross-feature interactions) need onboarding
  or a help panel.

### Scope

`*.help.md` is an app-layer convention — it applies to UI components
in `apps/` and framework adapter components in `modules/*/adapters/`.
Domain and port files do not get help sidecars.

## References

- ADR 0003 — Architecture metadata for AI cockpit
- ADR 0006 — Context-Optimized Architecture (the constraint this ADR refines)
- ADR 0007 — Tiered file-size limits (header lines no longer dominate small files)
- `scripts/lib/header.mjs` — header engine that implements both formats
