---
fileId: contextrail-template:tests:unit:react-starter.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/react-starter/
summary: Unit tests for the react-starter app verifying project structure, Vite config, and hex module integration.
owns: Unit-level proof for react-starter project structure and configuration.
boundaries: Tests react-starter structure and config only. Does not render React components.
invariants: Must verify package.json, vite.config, and hex module wiring exist.
securityPrivacy: No secrets.
notesForLLM: Structural tests for react-starter. Does not require React runtime.
tests: self
related: apps/react-starter/README.md
---

# react-starter.test.mjs
