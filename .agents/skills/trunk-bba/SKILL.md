<!-- @HEADER
 * @version 0.8.6 | 2026-05-11
 * @purpose Ship through trunk using Branch by Abstraction and stable seams instead of long-lived hidden branches.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# trunk-bba

Ship through trunk using Branch by Abstraction and stable seams instead of long-lived hidden branches.

## When to use

When new behavior cannot replace the old path in one safe slice.

## Shared workflow

- Introduce the seam first.
- Keep new behavior disabled by default until proof is green.
- Land seam-first or slice-first commits atomically rather than batching multiple finished slices.
- Remove the old path later in its own atomic cleanup when clearer.

## Commands

```bash
node scripts/checks/delivery-flow-check.mjs
node scripts/checks/control-plane-check.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/trunk-bba/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
