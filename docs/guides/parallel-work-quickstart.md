<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose One-pager quickstart for running multiple agents in parallel on the same Contextrail repository.
@sidecar parallel-work-quickstart.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Parallel work quickstart

Run two or more AI agents (or agent + human) on the same repository without merge conflicts. This one-pager covers the 80/20 — see [inter-agent-coordination.md](inter-agent-coordination.md) for the full protocol.

## Rule of thumb

| Situation | What to do |
|-----------|-----------|
| Each agent works inside its own module | Just work. No coordination needed. |
| Agent needs to use another module | Import through `public-api.mjs`. Done. |
| Agent needs to add behavior to another module | Add a new export (BBA seam). No claim needed. |
| Agent must modify existing shared code | File a claim first. |

Most parallel work falls into the first three rows. Claims are rare.

## 5-minute setup

### 1. Assign modules

Give each agent a clear scope:

```
Agent A → modules/auth/ + modules/permission/
Agent B → modules/cache/ + modules/retrieval/
Agent C → apps/starter/
```

Agents can read any module's `public-api.mjs` but only write to their assigned scope.

### 2. Start working

Each agent follows the normal flow:
1. Read `docs/SYSTEM_MAP.md` to orient
2. Write tests first
3. Implement the slice
4. Run `node scripts/checks/architecture-check.mjs`
5. Commit

No lock files, no branch coordination, no central scheduler.

### 3. Handle cross-boundary needs

**Adding to another module (common):**

```javascript
// Agent B needs a new function in auth's public API
// → Add a new export, don't modify existing ones

// In modules/auth/public-api.mjs — add at the bottom:
export { validateTokenScopes } from './domain/scopes.mjs';
```

Git merges additions cleanly. Two agents can both add exports to the same file.

**Modifying existing code (rare):**

```bash
# Check if anyone has a claim on the file
node scripts/checks/claim-check.mjs --query=modules/auth/public-api.mjs

# Acquire a claim (fails fast if conflict exists)
node scripts/checks/claim-check.mjs \
  --acquire \
  --agent=agent-b \
  --slice=TPL-042 \
  --targets=modules/auth/public-api.mjs \
  --action=modify
```

The pre-commit hook enforces claims automatically.

## What the pre-commit hook checks

The hook runs `claim-check.mjs --enforce --staged` in Phase 2. It will block your commit if:

- You modified a file that another agent has an active `modify` or `replace` claim on
- You modified a protected shared file (package.json, SYSTEM_MAP.md, CI configs) without a claim

It will **not** block:
- Work inside your own module
- Adding new files
- Extending files with BBA-additive changes when no conflicting claim exists

## Claim lifecycle

```
acquire → active → completed (auto on commit) → pruned
                 → expired (auto after TTL)    → pruned
```

Claims auto-complete when you commit the claimed files. They auto-expire after the TTL (default: 8 hours). Run `--prune` to clean up old claims.

## Troubleshooting

**"Claim conflict" on commit:**
Someone else has a claim on the same file. Run `--query` to see who, then coordinate directly or file a counter-claim with `strategy: "negotiate"`.

**"Protected path warning":**
You touched a shared infrastructure file without a claim. Either file a claim or, if the change is trivial (typo fix), the warning is advisory by default.

**Merge conflict after both agents commit:**
This means both agents modified the same lines — the claims protocol was bypassed. Resolve manually. This is rare when following BBA-first.

## Example: two agents, one repo

```
Agent A (auth feature)              Agent B (search feature)
─────────────────────               ──────────────────────
modules/auth/domain/                modules/search/domain/
modules/auth/adapters/              modules/search/adapters/
modules/permission/                 modules/retrieval/

Shared read (no conflict):
  Both import from modules/event-bus/public-api.mjs ✓
  Both import from modules/log/public-api.mjs ✓

Agent A needs cache:
  Adds new export to modules/cache/public-api.mjs ✓ (BBA seam)

No claims needed. Both agents commit independently.
```
