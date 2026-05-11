---
name: header-sidecar
description: Apply sidecar-first headers (ADR-0009) — slim inline header + all-YAML sparse sidecar.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Apply the repository’s sidecar-first header standard (ADR-0009) consistently by writing slim inline headers and all-YAML sparse sidecars with high-signal semantic fields.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# header-sidecar

Use this skill whenever a meaningful file is created or edited.

## Goal

Headers let another agent understand a file in seconds:

1. what the file is for
2. what it owns
3. what must not change casually
4. what it depends on
5. what boundary it belongs to
6. what tests or checks protect it
7. what risks or invariants matter
8. what minimum context is needed before editing it

## Two-part format (ADR-0009)

Every meaningful file carries:

1. A **slim inline header** (7 lines) inside the source file
2. A **sparse `.header.md` sidecar** with full metadata in YAML frontmatter

### Slim inline header

```js
/* @HEADER
 * @version 0.4.0 | 2026-04-06
 * @purpose One-line description of the file’s role.
 * @sidecar <filename>.header.md
 * @layer <layer> | @hex <hex-layer> | @ctx <bounded-context>
 * @public <true|false>
 * @edit <careful|rewrite-ok|append-only|sync-only|generated|manual-only>
 */
```

The `version` field is **not** a per-file version. It is the repository version current when that file was last materially changed.

### Sparse sidecar (all-YAML frontmatter)

All fields live in YAML frontmatter. The markdown body is decorative only (`# filename`).

```yaml
---
fileId: contextrail-template:modules:auth:domain:auth-state
module: modules/auth
stability: evolving
steward: shared
hexLayer: domain
boundedContext: auth
summary: Manage authentication state transitions.
owns: Auth state machine and session lifecycle.
boundaries: Pure domain logic. No infrastructure dependencies.
invariants: Must remain framework-free and testable in isolation.
notesForLLM: Core auth domain logic. Test in isolation without adapters.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
related:
  - modules/auth/ports/auth-port.mjs
  - tests/contract/auth-hex-contract.test.mjs
---

# auth-state.mjs
```

### Sidecar field reference

Machine fields (camelCase):

- `fileId`, `module`, `stability`, `steward`, `api`
- `hexLayer`, `portType`, `adapterType`, `boundedContext`
- `dependsOn` (YAML array)

Narrative fields (camelCase):

- `summary`, `owns`, `boundaries`, `invariants`, `risks`
- `securityPrivacy`, `notesForLLM`, `externalSystems`

List fields (YAML arrays when multi-valued):

- `tests`, `linkedDocs`, `specRefs`, `usmRefs`, `related`
- `allowedDependencies`, `forbiddenDependencies`

Changelog is **not** stored in sidecars. Use `CHANGELOG.md` via `changelog-sync.mjs` as the single source.

### Field-specific rules

- **`portType`**: indicates inbound/outbound direction of hex port files. All 40 port sidecars (31 `.mjs` + 9 `.d.ts`) are now classified. Inbound = the module's primary service interface (22 ports). Outbound = a dependency the module needs (9 ports: transport, chunker, document-loader, embedder, query-transformer, reranker, tokenizer, entity-extractor, graph-store).
- **`generated`**: removed from schema. Use `@edit generated` or `@edit sync-only` in the inline header instead.

### Enum rules

**edit** (inline `@edit`):

- `rewrite-ok` — normal direct edits acceptable if invariants hold
- `careful` — edits require dependency and consumer awareness
- `append-only` — add new entries, do not rewrite old history
- `sync-only` — change only to keep in sync with an authoritative source
- `generated` — do not hand-edit; prefer generator/input changes
- `manual-only` — human decision required before editing

**steward** (sidecar):

- `agent` — agent-led maintenance is normal
- `human` — human-led maintenance is expected
- `shared` — either human or agent may edit with context
- `generator` — generator is the normal writer
- `pipeline` — automated workflow is the normal writer

### File types without inline comments

For JSON, SVG, images, and other comment-unsafe formats: **sidecar-only** (no inline header). The sidecar is always `<file>.header.md`.

## Script-first workflow

1. Create or repair structure first.

   ```bash
   node scripts/checks/header-fix.mjs --changed
   ```

   or

   ```bash
   node scripts/checks/header-create.mjs <files...>
   ```

2. Improve semantic fields in the sidecar.
3. Validate.

   ```bash
   node scripts/checks/header-check.mjs --changed
   ```

4. Migrate old heavy headers to slim + sidecar.

   ```bash
   node scripts/checks/header-migrate.mjs
   ```

## Canonical insertion order

- shebang script: shebang first, header second
- markdown with YAML frontmatter: frontmatter first, header second
- markdown without frontmatter: header first
- comment-sensitive file: sidecar only

## How to write strong fields

### Purpose

Good:

- “Synchronize CHANGELOG.md with staged work-item IDs for the current commit.”

Weak:

- “Changelog script.”

### Owns

Good:

- “Deterministic commit-time changelog sync for the Unreleased section.”

Weak:

- “Changelog logic.”

### Boundaries

Good:

- “Must not become a release finalizer, artifact generator, or commit wrapper.”

Weak:

- “Used by release workflow.”

### Invariants

Good:

- “Must remain idempotent and must not rewrite unrelated sections.”

Weak:

- “Should work correctly.”

### Tests

Good:

- “.githooks/pre-commit; scripts/checks/header-check.mjs”

Weak:

- “Tests should be added later.”

### Risks

Good:

- “Regex drift can miss staged IDs and silently under-report changelog trace refs.”

Weak:

- “Editing may be risky.”

### NotesForLLM

Good:

- “Preserve shebang position and marker names. Do not introduce fuzzy parsing.”

Weak:

- “Be careful when editing.”

## Changelog block rule

The changelog block records only the latest meaningful change to the file.

Do not keep a full file history inside the header.

Use `- _none_` for empty sections.

## Minimum semantic review checklist

Before finishing header work, confirm:

- the header matches the file’s real current role
- ownership is specific
- boundaries say what the file must not become
- invariants are testable or operationally checkable
- tests name real protections
- EditPolicy and Steward are semantically correct
- NotesForLLM actually reduce first-pass code reading

