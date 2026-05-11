<!-- @HEADER
@version 0.8.0 | 2026-05-07
@purpose Root script folder index
@sidecar README.md.header.md
@layer tooling | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# scripts

Use this folder for executable repository automation.

## Main paths

- `scripts/checks/` — deterministic control-plane checks and sync steps used by hooks and package scripts.
- `scripts/agent-contract/` — compatibility-layer sync and parity checks for Claude and Codex adapters.
- `agent-context.mjs` — slice-aware context briefer; emits a token-budgeted markdown brief from a file list (Tier-1: SYSTEM_MAP category fragments). Usage: `node scripts/agent-context.mjs --files=<paths> --profile=mid`.
- `merge-snapshot.mjs` — produces the merged plain-text snapshot.
- `mergezip.mjs` — produces the merged snapshot plus zip archive under `.backups/`.
- `testall-mergezip.mjs` — runs `pnpm test:all` and still emits artifacts even if a test stage fails.

## Start here when editing

- workflow or policy gate change → `scripts/checks/README.md`
- shared Claude↔Codex contract change → `scripts/agent-contract/README.md`
- archive flow change → `scripts/mergezip.mjs` and `scripts/testall-mergezip.mjs`
- package script rename → update this README, `package.json.header.md`, and any skill/helper that delegates to scripts
