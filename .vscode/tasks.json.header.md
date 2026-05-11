---
fileId: contextrail-template:.vscode:tasks.json.header
module: .vscode
stability: evolving
steward: shared
api: Sidecar documentation
dependsOn: .vscode/tasks.json
summary: Sidecar documentation for VS Code task definitions that expose the repository’s common commands inside the editor.
owns: Documentation for the stable mapping between VS Code task labels and repository commands.
boundaries: This sidecar documents task intent and wiring only. It must not duplicate the entire task JSON or broader workflow docs.
invariants: Task labels stay aligned with settings.json references and real package or script commands.
risks: Label or command drift here breaks task buttons and editor-based workflow shortcuts.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Use this file to understand what each VS Code task is for and what else depends on its label.
tests: Manual review plus scripts/checks/header-check.mjs
linkedDocs:
  - .vscode/readme.md
  - README.md
related:
  - .vscode/settings.json.header.md
  - package.json
---

# tasks.json
