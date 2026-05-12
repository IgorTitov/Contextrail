<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Preserve modular boundaries and public-API-only access across the repo.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# hex-boundary

Preserve modular boundaries and public-API-only access across the repo.

## When to use

When a change touches module boundaries or imports.

## Shared workflow

- Go through public APIs only.
- Avoid deep imports and hidden cross-module reach-through.
- Escalate to repo-architect when the existing seam is insufficient.

## Commands

```bash
node scripts/checks/architecture-check.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/hex-boundary/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
