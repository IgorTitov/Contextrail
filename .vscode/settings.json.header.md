---
fileId: contextrail-template:.vscode:settings.json.header
module: .vscode
stability: evolving
steward: shared
api: Sidecar documentation
dependsOn: .vscode/settings.json
summary: Sidecar documentation for VS Code workspace settings, task-button wiring, and file association behavior.
owns: Documentation for VS Code workspace settings without modifying the comment-sensitive JSON body.
boundaries: This sidecar documents settings.json only. It must not become a second copy of the full settings payload.
invariants: Action button args must match real task labels; file associations stay aligned with the intended editing workflow.
risks: Task-label drift here silently breaks editor shortcuts and misleads future editors.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Treat this file as the explanation layer for workspace settings and task-button coupling.
tests: Manual review plus scripts/checks/header-check.mjs
linkedDocs: .vscode/readme.md
related: .vscode/tasks.json.header.md
---

# settings.json
