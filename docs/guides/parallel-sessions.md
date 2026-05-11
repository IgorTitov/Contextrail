<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose TBD-compliant guide for parallel agent sessions — worktree isolation as default, single worktree as fallback.
@sidecar parallel-sessions.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Parallel Agent Sessions — Safe Multi-Agent Setup

Multiple AI agents (Claude Code, Copilot, Aider, Codex) can work
simultaneously on the same repository safely. Two invariants:

1. **Worktree isolation** — each session gets its own disposable git worktree
2. **Claim discipline** — sessions declare intent via `claim-check --acquire`

---

## Background (Zvenix retrospective)

v0.6.7: Three parallel Claude sessions in one worktree experienced ~10
cases of work loss over 12 hours. Root cause: shared worktree meant
`git add -u` staged other sessions' WIP, header-fix stamped @version
in other sessions' files, pre-commit checks saw other sessions' broken
SpecRefs. Multiple script-level fixes were applied (ORIG_STAGED,
staged-only checks, --scope guards), but each new script was a new
potential staging bleed vector.

**v0.7.0 solution:** Worktree isolation eliminates the entire class of
problems at the filesystem level. Each session works in a clean copy.
No ORIG_STAGED needed, no per-script parallel awareness needed.

## Pattern 1: Worktree isolation (default for 2+ sessions)

This is the **recommended pattern** for any parallel work.

### Setup

```bash
# Session A: create worktree, acquire claims, work
node scripts/coa-worktree.mjs --create --name=session-gantt
cd ../coa-session-gantt  # or whatever the output path says
export COA_AGENT=session-gantt

node scripts/checks/claim-check.mjs --acquire \
  --agent=session-gantt --slice=G-18 \
  --targets=apps/web/src/features/gantt/* --action=modify

# ... implement slice ...
# ... write tests ...
# ... update CHANGELOG [Unreleased] section ...

git add <your files>
node scripts/coa-merge.mjs --message="feat(gantt): add timeline zoom"
```

```bash
# Session B: same pattern, different worktree
node scripts/coa-worktree.mjs --create --name=session-okr
cd ../coa-session-okr
export COA_AGENT=session-okr

node scripts/checks/claim-check.mjs --acquire \
  --agent=session-okr --slice=OKR-015 \
  --targets=apps/web/src/features/okr/* --action=modify

# ... implement slice ...

git add <your files>
node scripts/coa-merge.mjs --message="feat(okr): add progress tracking"
```

### Cleanup

```bash
# After merge, tear down worktree
cd /path/to/main/repo
node scripts/coa-worktree.mjs --teardown --name=session-gantt
```

### What coa-merge does

`coa-merge.mjs` replaces the manual commit ceremony with one command:

1. Verify staged files exist
2. `git pull --rebase origin main`
3. `claim-check --enforce --staged`
4. Read VERSION at HEAD, bump +1 patch
5. Write VERSION and package.json
6. `changelog-release.mjs --version=X.Y.Z`
7. Stage VERSION + package.json + CHANGELOG.md
8. `git commit` (pre-commit hook runs all phases)
9. `claim-check --auto-complete`
10. Optionally `git push`

If any step fails, the script stops with actionable guidance and emits
a collision telemetry marker to `.cockpit/markers/`.

### What coa-worktree does

```bash
node scripts/coa-worktree.mjs --create [--name=<session-name>]
  # Creates git worktree, symlinks node_modules, copies .env,
  # sets COA_AGENT identity, writes .coa-session metadata.

node scripts/coa-worktree.mjs --teardown --name=<session-name> [--force]
  # Removes a known worktree after checking for uncommitted changes.

node scripts/coa-worktree.mjs --list
  # Shows all active COA session worktrees.

# R4 / ADR-0016 lifecycle commands:

node scripts/coa-worktree.mjs --audit [--json] [--name=<X>]
  # Verdict per worktree: clean-active / clean-merged /
  # stale-merged-with-stamp-residue / stale-merged-with-wip /
  # divergent-with-wip / divergent-stamp-only /
  # merge-in-progress / unknown.

node scripts/coa-worktree.mjs --refresh --name=<X> [--dry-run|--execute]
  # Discards stamp-only @version residue, preserves logic edits.
  # Default: --dry-run.

COA_OPERATOR=1 node scripts/coa-worktree.mjs --teardown-stale --execute
  # Removes clean-merged worktrees only. Requires a prior --dry-run
  # (within 1h) and COA_OPERATOR=1 in the calling shell.
```

### Auditing worktrees

Run `--audit` periodically (and especially before starting a new
parallel session) so you know what's accumulated:

```bash
node scripts/coa-worktree.mjs --audit
```

The output's `VERDICT` column names the next safe action. Treat
each verdict as a contract: `clean-merged` is safe for
`--teardown-stale`; `stale-merged-with-stamp-residue` needs
`--refresh` first; anything containing `wip` requires manual
inspection — those represent real work the audit cannot decide for
you.

### Safely cleaning stamp-residue

Pre-commit `header-fix --since=HEAD --lazy-stamp` (ADR-0014) plus
the post-commit `@version` stamper produces stamp residue in
sibling worktrees that didn't participate in the commit. The
residue is regenerable — but accumulating it over many commits
makes the worktree look dirty and prevents `--teardown-stale` from
running.

```bash
# inspect what the refresh would touch (default mode is --dry-run):
node scripts/coa-worktree.mjs --refresh --name=session-X

# actually restore the stamp-only files:
node scripts/coa-worktree.mjs --refresh --name=session-X --execute
```

The classifier (`scripts/lib/worktree-refresh.mjs#classifyDiff`) is
**conservative** — anything ambiguous (whitespace-only churn, line
endings, mixed @version + logic edits, hunks reaching past the
slim header) classifies as `has-logic` and is preserved. `result.preserved`
in JSON mode lists every file the refresh declined to touch.

### Tearing down stale worktrees

`--teardown-stale` is a sharp knife. Three safety gates:

1. **`--dry-run` first.** Default mode. Lists eligible candidates,
   writes a marker file keyed by the candidate-set hash.
2. **`COA_OPERATOR=1` in the calling shell.** The COA harness does
   not propagate this env var to agent runs by default — only the
   human operator can supply it. Same model as
   `claim-check --force-expire` (TPL-225).
3. **Matching marker.** `--execute` requires a `--dry-run` marker
   for the same candidate set, less than 1 hour old, in the
   `.claims/` directory. Mid-flight changes invalidate the marker.

```bash
# 1. Inspect:
node scripts/coa-worktree.mjs --teardown-stale

# 2. Execute (operator-gated):
COA_OPERATOR=1 node scripts/coa-worktree.mjs --teardown-stale --execute
```

`--execute` writes a `worktree-teardown` JSONL event to
`.claims/audit.log` BEFORE removing the worktree; the event is the
audit trail for the operation. If the log write fails, the
worktree is NOT removed (atomic guarantee).

A worktree is ineligible for teardown when any of these hold:

- verdict ≠ `clean-merged`
- branch is the trunk
- branch appears in `--preserve=branch1,branch2`
- an active claim references the branch in `slice` / `notes` / `targets`
- `process.cwd()` is inside the candidate

### VERSION / CHANGELOG coordination

VERSION, CHANGELOG.md, and package.json are protected paths. With
worktree isolation:

```
Session A: coa-merge → pull --rebase → sees 0.7.5 → bumps to 0.7.6 → commit → push
Session B: coa-merge → pull --rebase → sees 0.7.6 → bumps to 0.7.7 → commit → push
```

coa-merge handles this automatically. Claims on these files are
BLOCKING — `--acquire` prevents simultaneous modifications.

## Pattern 2: Single worktree (fallback for 1 session or sequential work)

For simple sequential work or single-session use, the primary worktree
is fine. The same `coa-merge.mjs` command works.

```bash
# No worktree setup needed
node scripts/checks/claim-check.mjs --acquire \
  --agent=solo-session --slice=TPL-100 \
  --targets=modules/auth/* --action=modify

# ... implement slice ...

git add <your files>
node scripts/coa-merge.mjs --message="feat(auth): add token refresh"
```

**Rules for single-worktree parallel sessions (not recommended):**

1. Never `git add -u`, `git add .`, or `git add :/`
2. Always `git pull --rebase` before commit
3. Scope fix scripts: `header-fix --scope=<dir>`, `readme-fix --scope=<dir>`

## Recovery

When things go wrong:

```bash
# Diagnose issues
node scripts/coa-recover.mjs --diagnose

# Auto-fix safe issues (stale claims, orphaned worktrees)
node scripts/coa-recover.mjs --fix

# Force-expire a stuck claim
node scripts/checks/claim-check.mjs --force-expire --id=clm-XXXXXX
```

### Symptoms and fixes

**Merge conflicts on CHANGELOG / VERSION**
→ `coa-merge.mjs` handles pull --rebase automatically. If conflict persists,
resolve manually, then `git rebase --continue`.

**Stale claim blocking your work**
→ `claim-check --force-expire --id=<claim-id>` or `coa-recover --fix`.

**Orphaned worktrees after crash**
→ `coa-recover --fix` or `git worktree prune`.

**VERSION drift (working != HEAD + 1)**
→ `git checkout -- VERSION package.json && git pull --rebase`

## Enforcement layers (v0.7.0+)

1. **Worktree isolation** — each session works in its own filesystem copy.
   No staging bleed, no script scope bugs.

2. **coa-merge.mjs** — single command enforces pull, claims, version bump,
   changelog, tests, commit. Agents cannot skip steps.

3. **Pre-commit hook** — 7-phase validation runs on every `git commit`,
   regardless of agent type. Blocks on VERSION not bumped, claims
   conflicts, missing CHANGELOG, test failures.

4. **Claim guard (Claude Code only)** — `run-claim-guard.mjs` blocks
   Edit/Write on files with active claims from other sessions.

5. **Protected paths** — VERSION, CHANGELOG.md, package.json require
   claims before modification (`protectedPathMode: "block"`).

6. **Branch protection (remote)** — GitHub/GitLab require passing checks
   before push to main. Last line of defense, agent-independent.

## What to NEVER do

- **Never feature branches** — violates TBD (ADR-0002)
- **Never skip `claim-check --acquire`** for cross-module work
- **Never bypass coa-merge** with manual VERSION/CHANGELOG juggling

---

## Dispatch prompt templates

When issuing dispatch prompts for parallel sessions or cross-repo
backports, use the canonical templates in `docs/templates/`:

- [docs/templates/dispatch-prompt.md](../templates/dispatch-prompt.md) —
  parallel-session dispatch (one slice, one COA session)
- [docs/templates/backport-prompt.md](../templates/backport-prompt.md) —
  cross-repo backport (template → downstream repo)

Copy the relevant template, replace `<angle-bracket>` placeholders, and
paste into a fresh Sonnet tab inside a quadruple-backtick code block.
The hard-stops, out-of-scope, and required-deliverable sections are
structural — do not omit them.

---

**Related:**
- [ADR-0002](../adr/0002-trunk-based-delivery.md) — trunk-based delivery
- [ADR-0008](../adr/0008-inter-agent-coordination-protocol.md) — coordination protocol
- [Inter-Agent Coordination](inter-agent-coordination.md) — claims protocol
- [BBA Walkthrough](bba-walkthrough.md) — additive changes behind seams
- [Dispatch prompt template](../templates/dispatch-prompt.md) — canonical dispatch structure
- [Backport prompt template](../templates/backport-prompt.md) — canonical backport structure
