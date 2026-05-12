<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Screen risky commands, sensitive paths, and security regressions before calling work done.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->
# security-audit

Screen risky commands, sensitive paths, and security regressions before calling work done.

## When to use

When changes touch permissions, secrets, dangerous commands, or sensitive areas.

## Shared workflow

- Respect the portable dangerous-command blocker.
- Keep secrets out of docs and headers.
- Escalate security-sensitive ambiguity instead of guessing.

## Commands

```bash
node --test "tests/integration/dangerous-command-hook.test.mjs"
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/security-audit/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
