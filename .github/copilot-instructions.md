# Contextrail — Copilot Instructions
# Generated from docs/agent-contract/compatibility-contract.json
# Do not edit manually — run: node scripts/agent-contract/sync.mjs

## Project overview

This is a Contextrail (COA) template — a hexagonal-architecture monorepo with 40 modules. Context-Optimized Architecture treats AI agent context windows as a first-class design constraint.

## Architecture rules

- Hex module boundaries: cross-module access through `public-api.mjs` only.
- No deep imports into another module's internals.
- Domain stays framework-free; the app layer (`apps/*`) may use any UI framework.
- TDD is the default; bugfixes start with a failing regression test.
- Trunk-based delivery with Branch by Abstraction.
- Keep commits atomic and reviewable — one slice per commit.

## Non-negotiable principles

- Prefer the smallest implementation-ready slice that can be proven locally.
- Before implementing any user-facing behavior change, use product-planner first and confirm persona/workflow USM plus PRD coverage exists.
- Keep commits atomic and reviewable; one slice should become one commit before the next slice begins.
- Never mark work complete before checks, acceptance proof, changelog discipline, and commit discipline are satisfied.
- Use deterministic repository scripts and hooks as the executable truth.
- Keep architectural boundaries explicit and avoid broad repo wandering.
- Treat trunk plus Branch by Abstraction as the default delivery model.
- Never git add -u or git add . — always name specific files. Scope repo-wide fix scripts (header-fix, readme-fix, prettier, eslint) to your active directory, not repo-wide.

## Parallel session safety

When multiple AI agents work in the same repository simultaneously:

- Always `git pull --rebase` before committing.
- Always `claim-check --acquire` before modifying files outside your feature directory.
- Never run `header-fix` without `--scope=<dir>` — repo-wide runs overwrite other sessions' files.
- VERSION, CHANGELOG.md, package.json are protected — require claims.

## Navigation protocol

Use tiered loading to minimize context usage:

1. **Tier 1** — Start with `docs/SYSTEM_MAP.md` (~2150 tokens full, ~970 focused). Scan the Category Index to find your target domain.
2. **Tier 2** — Read `modules/X/manifest.json` + `public-api.mjs` + `README.md` for your target module.
3. **Tier 3** — Consult `docs/module-catalog.md` only if you need full API details.
4. **Deep-read only files you will actually change** and their direct collaborators.

## Quality commands

```bash
node scripts/checks/architecture-check.mjs
node scripts/checks/header-check.mjs
node scripts/checks/test-gate.mjs
node scripts/checks/changelog-sync.mjs --check
node scripts/checks/claim-check.mjs --enforce --staged
```

## Dangerous commands — do NOT run

- `rm -rf` or any recursive force-delete
- `git reset --hard`, `git clean -f`, force-push
- `git checkout -- .`, `git restore .`
- `curl ... | sh`, `wget ... | sh`

## Definition of done

- Trace links resolve for the changed slice.
- Required tests and deterministic checks pass.
- Architecture and public-API boundaries still hold.
- Headers, READMEs, and generated adapters are aligned.
- CHANGELOG.md and commit discipline are satisfied.

## Adapter discipline

- Source of truth: `docs/agent-contract/compatibility-contract.json`
- `.claude/CLAUDE.md` is the Claude adapter.
- `AGENTS.md` is the Codex adapter.
- `.cursorrules` is the Cursor adapter.
- `.github/copilot-instructions.md` is this Copilot adapter.
- All are generated from the same contract — do not edit manually.
