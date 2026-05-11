<!-- @HEADER
 * @version 0.8.6 | 2026-05-11
 * @purpose Keep backlog, PRD, USM, design, and proof references aligned around the changed slice.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# spec-traceability

Keep backlog, PRD, USM, design, and proof references aligned around the changed slice.

## When to use

When behavior, scope, or acceptance changes.

## Shared workflow

- Update linked docs and IDs.
- Repair stale references before finalization.
- Keep traceability tight enough for acceptance review.

## Commands

```bash
node scripts/checks/spec-check.mjs
node scripts/checks/backlog-sync.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/spec-traceability/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
