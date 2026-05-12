<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Implement one bounded backlog slice by deep-reading only touched files and direct collaborators.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->

# feature-delivery

Implement one bounded backlog slice by deep-reading only touched files and direct collaborators.

## When to use

For implementation-ready changes that should stay small and locally understandable.

## Shared workflow

- Start from one implementation-ready backlog slice.
- Stop and route back through product-planner if the slice lacks mandatory PRD or USM coverage.
- Read deeply only what you will change.
- Commit the slice before moving on to the next one.

## Commands

```bash
node scripts/checks/pre-impl-gate.mjs
node scripts/checks/delivery-flow-check.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/feature-delivery/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
