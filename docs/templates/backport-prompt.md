<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Canonical template for cross-repo backport prompts (template → downstream repo).
@sidecar backport-prompt.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Backport Prompt Template

## How to use this template

1. Copy this file.
2. Replace every `<angle-bracket>` placeholder with concrete values.
3. Fill in the compatibility-check and backport steps.
4. Paste the completed prompt into a fresh Sonnet tab wrapped in a
   quadruple-backtick code block.
5. Keep **Hard stops**, **Out of scope**, and **Required deliverable** intact.

A backport is a **new slice** in the target repo with its **own slice ID**
(e.g. `AIC-NNN`, `ZVX-NNN`).  It is NOT a copy of the source slice ID.

---

````
# <AIC-NNN|ZVX-NNN|...> — Backport: <source-slice-title> from template

## Context

You are an implementation session in the **<target-repo>** repository
(`<absolute-path-on-disk>/`).  The source of this backport is
Contextrail template commit `<short-hash>` — "<source-commit-title>" —
which shipped as `<template-TPL-NNN>` and bumped the template to
`v<X.Y.Z>`.

**Why this backport.** <1-2 sentences: what the source change fixed or
introduced and why the target repo needs it.>

**Target repo current state.** HEAD is at `v<target-X.Y.Z>`.
<Note any known divergence from template, e.g. "already has R2 checks
but not R4 lifecycle scripts".>

## Compatibility check (do this FIRST)

Before writing any code, verify the target repo has the prerequisites
listed below.  If any are missing, STOP and report — do not attempt
the backport without prerequisites in place.

| Prerequisite | Where to check | Required version / presence |
|---|---|---|
| <R-rule or script name> | `scripts/checks/<script>.mjs` | exists + passes |
| <…> | <…> | <…> |

```bash
# Run prerequisite checks
node scripts/checks/<check1>.mjs
node scripts/checks/<check2>.mjs
```

## Acceptance criteria

1. <Measurable outcome in the target repo.>
2. <…>
3. `header-check.mjs` passes on all new or modified files.
4. Commit lands on trunk via `coa-merge` in the **target repo**.

## Work to do

### Step 1: Create transport worktree (target repo)

```
cd <absolute-path-on-disk>
node scripts/coa-worktree.mjs --create --name=<slice-id-lower>
cd ../coa-session-<generated-suffix>
export COA_AGENT=<agent-name>
```

If `--create` fails because `main` is already used, work in the
main worktree.

### Step 2: Acquire claim

```
node scripts/checks/claim-check.mjs --acquire \
  --agent=<agent-name> \
  --slice=<AIC-NNN|ZVX-NNN> \
  --targets=<comma-separated file paths> \
  --action=<extend|modify|replace>
```

### Step 3: Port the change

Reference: template commit `<short-hash>` diff.

<Concrete file-by-file or hunk-by-hunk steps.  Do NOT blindly copy the
source diff — adapt to the target repo's structure, naming conventions,
and existing state.  Note any structural differences that require
adaptation.>

### Step 4: Adapt tests

<Describe what tests must be added or modified.  The target repo's test
patterns may differ from the template — follow the target repo's
conventions, not the template's.>

### Step 5: Verify

```
node scripts/checks/header-check.mjs
node scripts/checks/readme-check.mjs
pnpm test  # or target repo's test command
```

All must pass before committing.

### Step 6: Commit through coa-merge (target repo)

```
git add <your slice files>
node scripts/coa-merge.mjs \
  --message="<type>(<scope>): <summary> (<AIC-NNN|ZVX-NNN>)"
```

Include a body line: `Backports template <TPL-NNN> (commit <short-hash>)`.

### Step 7: Teardown (if worktree was created)

```
cd <absolute-path-on-disk>
node scripts/coa-worktree.mjs --teardown --name=<session-name>
```

## Hard stops — STOP and report

- Any compatibility prerequisite is missing — do not proceed without it.
- `header-check` or `readme-check` fails after writing files.
- `coa-merge` pre-commit hook fails — fix, do NOT pass `--no-verify`.
- A change in the template diff cannot be cleanly applied to the target
  repo without understanding target-repo specifics not present in this prompt.
- <Any backport-specific condition.>

## Out of scope (DO NOT do)

- Do NOT port UNRELATED changes from the source commit alongside this
  backport.  This is the anti-pattern that made the Zvenix tpl233-backport
  branch un-cherry-pickable in 2026-05-03.
- Do NOT use the source slice ID (<TPL-NNN>) as the target slice ID —
  the target repo has its own namespace.
- Do NOT apply template-side VERSION / CHANGELOG content verbatim —
  the target repo maintains its own version history.
- Do NOT <any other explicit anti-scope item>.

## Required deliverable — Summary file

Write to (in the TARGET repo):
`docs/analysis/session-summaries/<YYYY-MM-DD>_<AIC-NNN|ZVX-NNN>_Summary.md`

Required content:

- Source commit: `template:<short-hash>` + title + source slice ID
- Target commit hash, target VERSION after commit, files-changed count
- Compatibility check table (each prerequisite + PASS / FAIL)
- Acceptance verification table (each criterion + PASS / FAIL / SKIP + notes)
- `header-check` + `readme-check` exit codes and output
- Adaptations made (where target-repo structure differed from template)
- Any evasion vector or edge case encountered
- Pre-existing infrastructure debt skip-gates used (with justification)
- Anything to flag for the aggregator
````

---

## Field reference

| Field | What to write |
|---|---|
| `<target-repo>` | Repository name, e.g. `ai-cockpit`, `zvenix` |
| `<absolute-path-on-disk>` | Full path, e.g. `c:/Projects/ai-cockpit` |
| `<short-hash>` | First 8 chars of the template commit, e.g. `245891dc` |
| `<source-commit-title>` | Commit message subject from the template |
| `<template-TPL-NNN>` | Source slice ID in the template, e.g. `TPL-242` |
| `<AIC-NNN|ZVX-NNN>` | Target repo slice ID, e.g. `AIC-018` |
| `<agent-name>` | Functional role, e.g. `feature-implementer` |

## Critical discipline notes

**Backports are new slices.** A backport landing in ai-cockpit is `AIC-NNN`,
not `TPL-NNN`.  The target repo owns its own slice namespace and version history.

**Unrelated bundling is the #1 backport hazard.** The Zvenix tpl233-backport
branch became un-cherry-pickable because it bundled unrelated Zvenix-specific
work alongside the template change.  The "Out of scope" section is the primary
defense — be explicit about what NOT to include.

**Compatibility-first.** Some template R-rules depend on predecessor scripts.
Applying R4 lifecycle scripts to a repo that lacks R1 test isolation will produce
incorrect behavior.  The compatibility check step is mandatory, not advisory.

**Summary file path.** Write it to the target repo's
`docs/analysis/session-summaries/` directory, not the template's.
