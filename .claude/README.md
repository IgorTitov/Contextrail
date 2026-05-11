<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the role, structure, and boundaries of the repository-local Claude control plane.
@sidecar README.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# .claude

This folder contains project-local Claude Code customization.

## Structure

- `CLAUDE.md` — global project contract
- `settings.json` — project-level Claude Code settings and hooks
- `rules/` — focused rule documents
- `skills/` — project-local reusable skills
- `agents/` — project-local subagents
- `hooks/` — executable hook scripts
- `../docs/agent-contract/` — vendor-neutral shared process contract used to sync Claude and Codex adapters

## Design intent

Keep this folder small, explicit, and auditable.
Treat `.claude/CLAUDE.md` as the Claude adapter to the shared contract rather than a second independent process source.
Do not install large third-party bundles blindly.
