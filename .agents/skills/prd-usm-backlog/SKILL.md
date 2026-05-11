<!-- @HEADER
 * @version 0.8.6 | 2026-05-11
 * @purpose Normalize intake, PRD, USM, and backlog so implementation slices start from the right source.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# prd-usm-backlog

Normalize intake, PRD, USM, and backlog so implementation slices start from the right source.

## When to use

For new requests, decomposition, or spec normalization.

## Shared workflow

- Record raw intake first.
- Use product-planner first for decomposition and readiness checks.
- Use USM first for user-facing workflow changes.
- Advance only implementation-ready slices into execution.

## Commands

```bash
node scripts/checks/product-docs-check.mjs
node scripts/checks/usm-check.mjs
node scripts/checks/spec-sync.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/prd-usm-backlog/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
