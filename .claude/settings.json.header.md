---
fileId: contextrail-template:.claude:settings.json.header
module: .claude
stability: evolving
steward: shared
api: Sidecar documentation
dependsOn: .claude/settings.json
summary: Sidecar documentation for the project-level Claude settings JSON because inline comments are unsafe.
owns: Documentation for the project-level Claude settings, hook wiring, and safety posture without modifying the JSON file body.
boundaries: This sidecar documents settings.json only. It must not become a second copy of the hook implementation or the full policy contract.
invariants: SidecarFor stays .claude/settings.json; hook paths and matcher assumptions remain aligned with the real settings file.
risks: Drift here hides actual safety wiring and misleads future edits to settings.json.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Treat this as the explanation layer for settings.json. Update it when hook wiring or default safety posture changes.
tests:
  - tests/integration/repo-workflow.test.mjs
  - scripts/checks/header-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/hooks/README.md
related:
  - .claude/settings.json
  - .claude/hooks/run-dangerous-command-blocker.mjs
---

# settings.json
