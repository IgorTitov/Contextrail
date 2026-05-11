<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the VS Code workspace support files and how they map onto the repository’s documented workflow.
@sidecar readme.md.header.md
@layer editor | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# .vscode

## Purpose

Workspace configuration for VS Code:

- task buttons
- recommended extensions
- editor settings

## Files

- `settings.json` — action buttons and editor settings
- `tasks.json` — runnable tasks for Test / Merge & Zip / E2E
- `extensions.json` — recommended extensions
- `*.json.header.md` — sidecar headers for JSON files

## Rules

- JSON files use `.header.md` sidecars
- task labels must match button args in `settings.json`
- keep VS Code docs aligned with real scripts in `package.json`
