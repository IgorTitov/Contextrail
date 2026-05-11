<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the sync and parity-check scripts for the shared Claude↔Codex compatibility layer.
@sidecar README.md.header.md
@layer tooling | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# scripts/agent-contract

These scripts maintain the shared Claude↔Codex compatibility layer.

## Entry points

- `sync.mjs` — renders `AGENTS.md`, `.agents/skills/**`, `.agents/README.md`, `.agents/skills/README.md`, and the synced compatibility block inside `.claude/CLAUDE.md` from `docs/agent-contract/compatibility-contract.json`.
- `check.mjs` — verifies that generated adapters still match the canonical JSON contract and that the required hook/package wiring exists.

## Typical flow

```bash
node scripts/agent-contract/sync.mjs
node scripts/agent-contract/check.mjs
```

Use the sync script after editing the canonical contract. Use the check script before commit or in CI to prevent drift.
