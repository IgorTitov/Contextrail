<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Keep changelog and release/finalization discipline aligned with the real change.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# changelog-release

Keep changelog and release/finalization discipline aligned with the real change.

## When to use

Before commit-ready finalization or artifact generation.

## Shared workflow

- Sync CHANGELOG.md structurally.
- Confirm artifact creation is actually needed.
- Keep release notes aligned with the bounded slice.

## Commands

```bash
node scripts/checks/changelog-sync.mjs --check
pnpm mergezip
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/changelog-release/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
