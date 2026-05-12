<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Implement visible UI slices with explicit accessibility, messages, and selector discipline.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# frontend-delivery

Implement visible UI slices with explicit accessibility, messages, and selector discipline.

## When to use

For user-visible UI work or DOM-contract changes.

## Shared workflow

- Keep copy in a messages layer from day one.
- Use stable selectors from a bounded registry.
- Treat accessibility states as part of the slice, not a follow-up.
- Do not start user-facing implementation until persona/workflow USM plus PRD coverage exists.

## Commands

```bash
node scripts/checks/pre-impl-gate.mjs
node scripts/checks/design-docs-check.mjs
pnpm test:bdd
pnpm e2e:headed
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/frontend-delivery/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
