<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Keep folder-level READMEs aligned with real ownership and entrypoints.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# readme-discipline

Keep folder-level READMEs aligned with real ownership and entrypoints.

## When to use

When folder purpose or workflow entrypoints change.

## Shared workflow

- Update the owning folder map.
- Keep the README navigational instead of policy-duplicating.
- Make real entrypoints discoverable.

## Commands

```bash
node scripts/checks/readme-check.mjs
node scripts/checks/readme-fix.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/readme-discipline/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
