<!-- @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Start from the smallest failing proof, then implement only what makes it pass.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# tdd

Start from the smallest failing proof, then implement only what makes it pass.

## When to use

By default for implementation and especially for bugfixes.

## Shared workflow

- Write the failing proof first.
- Implement the smallest change that makes it pass.
- Keep refactors separate from proof creation when possible.
- Prefer finishing and committing the proven slice before opening the next failing proof.

## Commands

```bash
node scripts/checks/test-gate.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/tdd/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
