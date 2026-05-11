---
fileId: contextrail-template:.vscode:extensions.json.header
module: .vscode
stability: evolving
steward: shared
api: Sidecar documentation
dependsOn: .vscode/extensions.json
summary: Sidecar documentation for recommended VS Code extensions and the workflow they support in this template.
owns: Documentation for extension recommendations and the editor workflows they are meant to improve.
boundaries: This sidecar explains why extensions are recommended. It must not become a generic wishlist or a dump of personal preferences.
invariants: Recommendations stay tied to real repository workflows rather than aesthetic or speculative tooling.
risks: Drift here makes extension recommendations noisy and less trustworthy.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Prefer a short, workflow-backed recommendation set. Update this when the editor toolchain meaningfully changes.
tests: Manual review plus scripts/checks/header-check.mjs
linkedDocs: .vscode/readme.md
related:
  - .vscode/settings.json.header.md
  - .vscode/tasks.json.header.md
---

# extensions.json
