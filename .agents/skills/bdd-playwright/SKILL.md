<!-- @HEADER
 * @version 0.8.6 | 2026-05-11
 * @purpose Express visible behavior through Gherkin and deterministic browser-oriented proof when needed.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# bdd-playwright

Express visible behavior through Gherkin and deterministic browser-oriented proof when needed.

## When to use

For UI or UX changes that need Gherkin coverage or browser smoke proof.

## Shared workflow

- Write or tighten Gherkin scenarios first.
- Map selectors through the bounded registry and stable hooks.
- Keep browser proof deterministic and scoped to the visible change.
- Use headed mode when you need to watch the user-facing flow directly.
- Keep each .feature file scoped to one module or one user flow — never a monolithic all-features file.
- Ensure each .feature + step definitions fit within a 4K-8K token file-size budget.
- Use domain language in scenarios, not implementation details.
- Cross-module walkthroughs belong in tests/e2e/ only — tests/bdd/ stays modular.

## Commands

```bash
pnpm test:bdd
pnpm test:e2e:smoke
pnpm e2e:headed
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/bdd-playwright/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
