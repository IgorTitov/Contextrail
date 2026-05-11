<!-- @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Close an implemented slice against acceptance and determine readiness for finalization.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# acceptance-validation

Close an implemented slice against acceptance and determine readiness for finalization.

## When to use

When the code exists and acceptance proof is the missing step.

## Shared workflow

- Compare slice behavior against linked backlog/spec intent.
- Add only the smallest missing proof.
- Decide ready-for-finalization only when acceptance is explicit.
- Do not mark the slice done until commit discipline is also satisfied.
- Verify BDD .feature files are scoped to one module or flow, not monolithic.
- Verify scenarios are independent with no shared mutable state or ordering dependencies.
- Verify selectors come from the ui-selectors registry, not hardcoded strings.
- Reject cross-module scenarios in tests/bdd/ — the dedicated walkthrough under tests/e2e/ is exempt.

## Commands

```bash
node scripts/checks/test-gate.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/acceptance-validation/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
