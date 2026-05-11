<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Aider adapter — coding conventions generated from the shared compatibility contract.
@sidecar CONVENTIONS.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public true
@edit sync-only -->

# Conventions

This file is the Aider adapter for this repository's shared delivery contract.
Source of truth: `docs/agent-contract/compatibility-contract.json`.

## Architecture

- Modular monolith with hexagonal architecture under `modules/<name>/`.
- Cross-module imports only through `public-api.mjs` — deep imports are forbidden.
- Domain layer is framework-free and has no external dependencies.
- Ports define contracts. Adapters implement them.
- The app layer (`apps/*`) wires adapters to the target platform.

## Navigation

1. Read `docs/SYSTEM_MAP.md` first — the ultra-compact system overview (~950 tokens focused).
2. For your target module: read `modules/X/manifest.json` + `public-api.mjs`.
3. For full API details: `docs/module-catalog.md`.

## Development rules

- TDD is the default. Bugfixes start with a failing regression test.
- One atomic slice = one commit. Do not batch multiple slices.
- Keep files small, narrow in responsibility, and LLM-friendly.
- Every meaningful folder needs a `README.md`.
- Delivery uses Trunk-Based Development with Branch by Abstraction.
- Never `git add -u` or `git add .` — always name specific files.
- Never run `header-fix`, `readme-fix`, `prettier --write`, or `eslint --fix` repo-wide — scope to your directory.
- Always `git pull --rebase` before bumping VERSION, CHANGELOG, or package.json.
- Use `claim-check --acquire` before modifying files outside your feature directory.

## Dangerous commands — do NOT run

- `rm -rf` — recursive force-delete
- `mkfs` — filesystem format
- `dd if=` — raw disk write
- `git reset --hard` — discards uncommitted work
- `git clean -fdx` — removes untracked files including ignored ones

Full blocklist: `docs/agent-contract/dangerous-commands.json`.

## Cross-boundary work

Before modifying files outside your target module, check `.claims/` for active claims.
Prefer BBA-additive strategy (new export behind a seam) over modifying existing code.

## Testing

- Unit tests prove domain logic.
- Integration tests prove application orchestration.
- Contract tests prove adapter compliance.
- BDD proves user-visible flows.
- Run `pnpm test:unit` before committing.

## Quality gates

```bash
node scripts/checks/architecture-check.mjs   # hex boundary enforcement
node scripts/checks/header-check.mjs          # header discipline
node scripts/checks/test-gate.mjs             # test coverage gate
```
