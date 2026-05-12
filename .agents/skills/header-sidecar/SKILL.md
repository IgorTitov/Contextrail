<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Keep structured headers and sidecars aligned with the real file role.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->

# header-sidecar

Keep structured headers and sidecars aligned with the real file role.

## When to use

When files are added or their responsibility changes.

## Shared workflow

- Use inline headers where safe.
- Use <file>.header.md sidecars for comment-sensitive formats.
- Repair semantic drift at the header owner, not in random comments.

## Commands

```bash
node scripts/checks/header-check.mjs
node scripts/checks/header-fix.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/header-sidecar/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
