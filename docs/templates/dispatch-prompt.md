<!-- @HEADER
@version 0.7.102 | 2026-05-05
@purpose Canonical template for parallel-session dispatch prompts (one slice, one COA agent session).
@sidecar dispatch-prompt.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Dispatch Prompt Template

## How to use this template

1. Copy this file.
2. Replace every `<angle-bracket>` placeholder with concrete values.
3. Fill in the slice-specific implementation steps (Step 3 onward).
4. Paste the completed prompt into a fresh Sonnet tab wrapped in a
   quadruple-backtick code block so the agent receives it as a single block.
5. Keep the **Hard stops**, **Out of scope**, and **Required deliverable**
   sections intact — they are structural, not optional.

---

````
# <TPL-NNN> — <one-line slice title>

## Context

You are a parallel implementation session in the Contextrail template
repo (`c:/Projects/contextrail-template`).  HEAD is at v<X.Y.Z>
(or v<X.Y.Z+1> if <preceding-slice-ID> has landed; check VERSION).

<2-3 sentences: what problem this slice closes, what triggered it,
relevant ADR / Rules-Registry cross-references.>

This is a <documentation / implementation / bugfix / refactor> slice.

## Acceptance criteria

1. <Measurable outcome — test passes, file exists, constant has value, etc.>
2. <…>
3. `header-check.mjs` passes on all new or modified files.
4. Commit lands on trunk via `coa-merge`.

## Work to do

### Step 1: Create transport worktree

```
node scripts/coa-worktree.mjs --create
```

Auto-pick selects the next-free slice ID and prints `[coa-worktree] auto-picked: <ID>`.
Capture that ID — it becomes your `<TPL-NNN>` for the rest of the ceremony.

```
cd ../<repo>-tx-<auto-picked-ID>
export COA_AGENT=<agent-name>
```

If you need a specific ID: `node scripts/coa-worktree.mjs --create --slice=<TPL-NNN>`.
If `--create` fails because `main` is already used (single active worktree),
skip worktree creation and work directly in the main worktree.

### Step 2: Acquire claim

```
node scripts/checks/claim-check.mjs --acquire \
  --agent=<agent-name> \
  --slice=<TPL-NNN> \
  --targets=<comma-separated file paths> \
  --action=<extend|modify|replace>
```

Use `extend` for new files, `modify` for existing files.  If targets
mix new and existing, run two separate `--acquire` calls.

### Step 3: <First implementation step>

<Concrete instructions.  Prefer script invocations over prose.>

### Step 4: <…>

<Continue in dependency order.  Each step should be independently
verifiable — a reviewer must be able to see what "done" means for each.>

### Step N-1: Verify

```
node scripts/checks/header-check.mjs
node scripts/checks/readme-check.mjs
# any other check relevant to this slice
```

Both must pass before committing.

### Step N: Commit through coa-merge

```
git add <your slice files>
node scripts/coa-merge.mjs \
  --message="<type>(<scope>): <summary> (<TPL-NNN>)"
```

Commit message rules (enforced by pre-commit hook):
- Subject ≤ 100 chars, no trailing period
- Allowed types: feat, fix, docs, test, refactor, chore, perf, build, ci, style
- Body lines ≤ 72 chars; at least one line must match `[A-Z][A-Z0-9]+-\d{3,}`

### Step N+1: Teardown (if worktree was created)

```
cd /path/to/main/repo
node scripts/coa-worktree.mjs --teardown --name=<session-name>
```

## Hard stops — STOP and report

- `header-check` or `readme-check` fails after writing new files.
- `coa-merge` pre-commit hook fails — fix the issue, do NOT pass `--no-verify`.
- A claim conflict is detected — resolve before proceeding.
- <Any slice-specific condition that must abort before commit.>

Do not proceed past these. Report findings and stop.

## Out of scope (DO NOT do)

- Do NOT <explicitly name the first anti-scope-creep item>.
- Do NOT <name the second — e.g., "touch unrelated modules", "fix
  nearby issues while here", "bundle a refactor with this fix">.
- Do NOT bundle "while I'm here" edits — only the minimum spanning
  change for this slice (see `.claude/rules/development.md`).

## Required deliverable — Summary file

Write to:
`docs/analysis/session-summaries/<YYYY-MM-DD>_<TPL-NNN>_Summary.md`

This file is gitignored.  Required content:

- Final commit hash, VERSION after commit, files-changed count
- Acceptance verification table (each criterion + PASS / FAIL / SKIP + notes)
- `header-check` + `readme-check` exit codes and output
- Any evasion vector or edge case encountered
- Pre-existing infrastructure debt skip-gates used (with justification)
- Any side action taken with justification
- Anything to flag for the aggregator (next-rule considerations,
  follow-up slices, unresolved concerns)
````

---

## Field reference

| Field | What to write |
|---|---|
| `<TPL-NNN>` | Backlog slice ID, e.g. `TPL-244` |
| `<one-line slice title>` | ≤ 60 chars describing the deliverable |
| `v<X.Y.Z>` | Read from `VERSION` at the time of dispatch |
| `<agent-name>` | Functional role, e.g. `tech-writer`, `feature-implementer` |
| `<slice-id-lower>` | Lowercase kebab, e.g. `tpl-244` |
| `<type>(<scope>)` | Conventional Commits type+scope, e.g. `docs(templates)` |

## Anti-patterns to avoid

**Bundling out-of-scope fixes.** TPL-242 shipped 3 unrelated security/test/operational
fixes inside an agent-contract refactor commit; a TPL-243 amendment was needed to
surface them.  The "Out of scope" section exists to prevent this — be explicit.

**Missing summary file.** The aggregator can only find findings if the summary
file exists on disk at the expected path.  The `docs/analysis/session-summaries/`
directory is gitignored; write the file anyway — it lives for the duration of the
aggregation session.

**Version pre-picking.** Never write `@version X.Y.Z` in file headers manually.
The pre-commit hook stamps the correct version from `VERSION` automatically.

**Skipping `coa-merge`.** Manual `git commit` bypasses the 7-phase validation.
Use `coa-merge` even for documentation-only slices.
