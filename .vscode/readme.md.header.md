---
fileId: contextrail-template:.vscode:readme
module: .vscode
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .vscode/settings.json
  - .vscode/tasks.json
  - .vscode/extensions.json
  - .vscode/settings.json.header.md
  - .vscode/tasks.json.header.md
  - .vscode/extensions.json.header.md
summary: Explain the VS Code workspace support files and how they map onto the repository’s documented workflow.
owns: The folder-level guide to editor settings, task wiring, and extension recommendations for this template.
boundaries: This file is editor-support documentation only. It must not become a duplicate of the full task list or settings payload.
invariants: The described task labels, file associations, and extension purpose stay aligned with the actual .vscode files.
risks: Drift here makes the editor layer confusing and hides broken task wiring.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Use this file as a quick map to the VS Code support layer. Update it when task labels or editor wiring changes.
tests: Manual review plus scripts/checks/header-check.mjs
linkedDocs:
  - README.md
  - .claude/CLAUDE.md
related:
  - .vscode/settings.json.header.md
  - .vscode/tasks.json.header.md
  - .vscode/extensions.json.header.md
---

# readme.md
