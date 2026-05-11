<!-- @HEADER
 * @version 0.8.6 | 2026-05-11
 * @purpose Shape repo-level orchestration and control-plane changes without creating duplicate authority.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# control-plane-design

Shape repo-level orchestration and control-plane changes without creating duplicate authority.

## When to use

For new process surfaces, role maps, or compatibility-layer design.

## Shared workflow

- Choose a canonical owner first.
- Keep adapters thin and explicit.
- Back new orchestration claims with scripts, hooks, or tests.

## Commands

```bash
node scripts/agent-contract/check.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/control-plane-design/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
