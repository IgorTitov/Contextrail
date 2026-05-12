<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Audit drift across instructions, hooks, scripts, docs, and tests, then repair the real source.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->

# control-plane-audit

Audit drift across instructions, hooks, scripts, docs, and tests, then repair the real source.

## When to use

When orchestration surfaces or agent adapters may have diverged.

## Shared workflow

- Run deterministic drift checks first.
- Classify disagreement as source drift, unsupported claim, or stale adapter.
- Fix the canonical owner instead of layering duplicate prose.

## Commands

```bash
node scripts/checks/control-plane-check.mjs
node scripts/agent-contract/check.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/control-plane-audit/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
