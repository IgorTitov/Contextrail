---
fileId: contextrail-template:root:package-json-header
module: root
stability: evolving
steward: shared
api: Sidecar documentation
dependsOn: package.json
summary: Operational sidecar for package.json covering workflow scripts, project-prefix manifest settings, proof layers, design-lane checks, and artifact commands without placing comments inside the manifest.
owns: The operational sidecar for package.json workflow scripts and proof-surface assumptions.
boundaries: This file documents the manifest contract only. It must not become a duplicate of the whole repository policy.
invariants: Script names, compatibility entrypoints, proof layers, and artifact commands stay aligned with package.json and current workflow docs.
risks: Drift here can misstate which scripts are canonical, which FileId namespace is active, or how proof and artifact flows are invoked.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Keep this sidecar focused on script ownership, project-prefix settings, and invocation. Update it when command names, namespace settings, or proof-surface expectations change.
tests:
  - node scripts/agent-contract/check.mjs
  - node scripts/checks/design-docs-check.mjs
  - node scripts/checks/control-plane-check.mjs
  - tests/integration/repo-workflow.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - AGENTS.md
  - docs/agent-contract/README.md
  - tests/README.md
  - scripts/checks/README.md
related:
  - package.json
  - .vscode/tasks.json.header.md
---

# package.json
