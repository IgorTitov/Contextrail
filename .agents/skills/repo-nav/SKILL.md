<!-- @HEADER
 * @version 0.8.6 | 2026-05-12
 * @purpose Navigate untouched repo areas through headers, public APIs, tests, and nearby docs first.
 * @sidecar SKILL.md.header.md
 * @layer control-plane
 * @public true
 * @edit sync-only
 -->

# repo-nav

Navigate untouched repo areas through headers, public APIs, tests, and nearby docs first.

## When to use

When you need context without loading large parts of the codebase.

## Shared workflow

- Start from headers and folder docs.
- Use public APIs and tests as the next boundary.
- Only deep-read internals when the current slice truly depends on them.

## Commands

```bash
node scripts/checks/control-plane-check.mjs
```

## Shared contract notes

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- Claude-side detailed reference: `.claude/skills/repo-nav/SKILL.md`
- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.
