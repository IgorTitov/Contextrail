---
fileId: contextrail-template:scripts:bootstrap
module: scripts
stability: evolving
steward: shared
api: "CLI: node scripts/bootstrap.mjs"
summary: Implement the bootstrap repository script.
owns: Project bootstrapping — replaces placeholders, updates package.json, installs hooks for new projects.
boundaries: Runs once at project init; does not affect runtime behavior.
invariants: Must be idempotent — safe to re-run without breaking an already-initialized project.
risks: Incorrect placeholder replacement can corrupt template files.
notesForLLM: Entry point for new-project setup. Reads manifest files and rewrites placeholders.
tests: tests/e2e/template-bootstrap.spec.mjs
---

# bootstrap.mjs
