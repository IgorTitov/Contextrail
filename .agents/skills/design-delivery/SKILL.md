<!-- @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Carry user-facing design work from intent to accepted handoff without replacing PRD or USM.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# design-delivery

Carry user-facing design work from intent to accepted handoff without replacing PRD or USM.

## When to use

For brand, screen-state, prompt-authoring, or asset-handoff work.

## Shared workflow

- Keep design docs under docs/design/.
- Use design as a supplement to PRD and USM.
- Hand off only accepted assets or explicit references.

## Commands

```bash
node scripts/checks/design-docs-check.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/design-delivery/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
