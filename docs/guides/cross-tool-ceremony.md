<!-- @HEADER
@version 0.8.13 | 2026-05-11
@purpose Unified COA commit ceremony walkthrough for Codex CLI and Aider users.
@sidecar cross-tool-ceremony.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Cross-tool ceremony guide: Codex CLI and Aider

This guide covers the COA commit ceremony for AI agents using **Codex CLI** or **Aider**
as their harness. The ceremony steps are identical across tools — only the initial
setup commands differ.

---

## 1. Purpose

The COA commit ceremony is the sequence that converts a bounded implementation slice
into a single, reviewable, version-stamped trunk commit. It handles: transport worktree
lifecycle, quality gates, VERSION bump, CHANGELOG update, and commit discipline.

All agents — Claude Code, Codex, Aider, or any other — follow the same ceremony. This
guide fills in the ceremony detail that `AGENTS.md` references but does not expand.

---

## 2. The common ceremony loop

Every agent runs the same four-step loop:

```bash
# Step 1 — Create transport worktree (auto-picks slice ID)
node scripts/coa-worktree.mjs --create --agent=<your-role>
# Output: [coa-worktree] auto-picked: APP-NNN
# Work directory: c:/Projects/.worktrees/<project>-tx-APP-NNN/

# Step 2 — Do the work
# Edit files, run tests, fix issues — all inside the transport worktree

# Step 3 — Merge ceremony (VERSION bump, quality gates, commit)
node scripts/coa-merge.mjs \
  --message="<type>(<scope>): description (APP-NNN)" \
  --agent=<your-role>

# Step 4 — Tear down the transport worktree
node scripts/coa-worktree.mjs --teardown --name=tx-APP-NNN
```

### What coa-merge does (Step 3)

`coa-merge` is not a thin git wrapper. It runs:

1. Ownership check (`.coa-session.agent` matches `--agent`)
2. `git pull --rebase` to bring trunk changes into the worktree
3. Claim enforcement (blocks on active conflicting claims)
4. VERSION bump (patch increment unless `--no-bump`)
5. CHANGELOG release (moves `[Unreleased]` into a timestamped section)
6. Quality gate phases (header-check, readme-check, architecture-check, test-gate, etc.)
7. `git commit` with the supplied message
8. Claim auto-complete

If any step fails, `coa-merge` stops and prints recovery guidance.

---

## 3. Codex CLI

### How Codex reads project context

Codex automatically loads `AGENTS.md` from the project root at startup. This file
contains the delivery contract, role routing, quality gate commands, and skill roster.
No additional configuration is needed for Codex to understand the repo's rules.

The `.agents/skills/` directory is also read by Codex. Each `SKILL.md` is a workflow
module (e.g. `feature-delivery`, `tdd`, `hex-boundary`).

### Starting a Codex slice

Codex works from the **main worktree** to create the transport worktree, then switches
context into it:

```bash
# Operator or Codex runs this from the main repo root
node scripts/coa-worktree.mjs --create --agent=codex
# Output: [coa-worktree] auto-picked: APP-NNN
# cd c:/Projects/.worktrees/<project>-tx-APP-NNN/
```

Codex then works in the `tx-APP-NNN` directory for the rest of the slice.

### Conventional agent role

Use `--agent=codex` for Codex sessions. This value is recorded in `.coa-session.agent`
inside the worktree and is matched by `coa-merge` step 0.5 (ownership check).

### Codex and external dispatch

Codex CLI does not support external session dispatch the way Claude Code's `Agent`
tool does. For Codex, the operator pastes ceremony commands into the session, and
Codex runs them. The ceremony steps themselves are identical — only the invocation
path differs.

---

## 4. Aider

### How Aider reads project context

Aider reads `AGENTS.md` automatically from the current directory. For structured
slice dispatch using the token-budgeted briefer, pass additional context files via
`--read`:

```bash
# Minimal: Aider with AGENTS.md auto-loaded
aider --model <your-model>

# Structured dispatch: briefer generates context, passed to Aider via --read
node scripts/agent-context.mjs --slice=APP-NNN --files=<touched-files> > /tmp/brief.md
aider --read /tmp/brief.md --model <your-model>

# Or use the pnpm wrapper (TPL-306)
pnpm byollm:dispatch --slice=APP-NNN
```

For local LLM setup (LM Studio + Aider), see
[byollm-feature-dispatch.md](byollm-feature-dispatch.md) and
[local-frameworks.md](local-frameworks.md).

### Starting an Aider slice

The operator runs the worktree create step; Aider works inside it:

```bash
# Operator: create transport worktree before launching Aider
node scripts/coa-worktree.mjs --create --agent=aider
# Output: [coa-worktree] auto-picked: APP-NNN

# Operator: launch Aider inside the transport worktree
cd c:/Projects/.worktrees/<project>-tx-APP-NNN/
aider --model <your-model>
```

After Aider exits, the operator runs the merge ceremony:

```bash
# Operator: from inside the transport worktree
node scripts/coa-merge.mjs \
  --message="feat(module): description (APP-NNN)" \
  --agent=aider
```

### Conventional agent role

Use `--agent=aider` for Aider sessions. For local-LLM-specific sessions with the
briefer, `--agent=local-llm` is also used in practice — pick one and stay consistent
within a single ceremony.

### Aider auto-commits

Aider commits automatically by default. **Disable auto-commit** when using the COA
ceremony — `coa-merge` owns the commit step:

```bash
aider --no-auto-commits --model <your-model>
```

Without `--no-auto-commits`, Aider may commit before `coa-merge` can bump VERSION
and run quality gates, producing a version-less commit that breaks ceremony discipline.

---

## 5. Common ceremony rules (all tools)

These rules apply regardless of which agent runs the ceremony:

### Commit message format

Messages must follow Conventional Commits with a slice ID reference:

```
<type>(<scope>): description (APP-NNN)
```

- **Allowed types:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`,
  `build`, `ci`, `style`
- **Header ≤ 100 characters** (the `commit-msg` hook enforces this)
- **Slice ID required** — pattern `[A-Z][A-Z0-9]+-\d{3,}` (e.g. `TPL-326`)

### Never touch `@version` in headers

Do not write `@version` values in file headers. Pre-commit Phase 5 stamps the correct
version automatically from the `VERSION` file. Manual edits cause version drift in
parallel sessions.

### COA_SKIP_GATES by slice type

| Slice type | COA_SKIP_GATES |
| --- | --- |
| Feature (new code + tests) | _(none — all phases run)_ |
| Doc-only, comments, README | `"1,3,4,6"` |
| Backport, infra-fix, tooling | `"1,3,4,6"` |

Phases 0, 1.0, 2.5, 2.6, 2.7 and 7 are non-skippable in this template regardless
of `COA_SKIP_GATES`. Full reference: `.claude/rules/development.md` § "COA_SKIP_GATES
by slice type".

### If `coa-worktree --create` fails

**STOP.** Do not attempt to reuse existing state or bypass the error. Read the full
error message — it includes specific recovery options. If the path forward is unclear,
escalate to the operator before continuing. (Background: ZVX-DEV-101 incident — a
bypassed creation left a dirty worktree that corrupted a subsequent ceremony.)

---

## 6. Troubleshooting

### "Phase 7 FAIL"

Run the test gate directly to see which tests fail:

```bash
node scripts/checks/test-gate.mjs
```

Fix the failing tests before re-running `coa-merge`.

### "Hook integrity FAIL after retry"

The pre-commit hook detected that a required hook file is missing or has changed.
Restore it:

```bash
node scripts/checks/hook-integrity-check.mjs --update
```

### "claim-check: no active claim"

You are either in the wrong directory (main repo instead of transport worktree) or
the claim was never created. Verify:

1. Your CWD is `c:/Projects/.worktrees/<project>-tx-APP-NNN/` (the transport worktree)
2. A `.claims/<claim-id>.json` exists in the **main repo root** (not the worktree)
   with `status: "active"` and your agent name

```bash
# Check from transport worktree:
node scripts/checks/claim-check.mjs --query=<path-you-are-modifying>
```

### "agent-unknown" on coa-merge

`coa-merge` requires `--agent=<role>` when running from a `tx-*` transport branch.
Verify you passed the same `--agent` value used in `--create`:

```bash
node scripts/coa-merge.mjs --message="..." --agent=codex   # or --agent=aider
```

---

## Further reading

- [AGENTS.md](../../AGENTS.md) — Codex-first delivery contract (auto-loaded)
- [byollm-feature-dispatch.md](byollm-feature-dispatch.md) — full Aider + briefer workflow
- [local-frameworks.md](local-frameworks.md) — LM Studio + Aider environment setup
- [agent-framework-integration.md](agent-framework-integration.md) — third-party agent compatibility matrix
- [parallel-sessions.md](parallel-sessions.md) — multi-agent parallel work safety
