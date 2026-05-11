---
fileId: contextrail-template:scripts:lib:errors
module: scripts/lib
stability: evolving
steward: shared
api: "{ ScriptError, ValidationError, FileNotFoundError, ParseError, SchemaError }"
summary: Typed error hierarchy for deterministic repo scripts so failures carry machine-readable context instead of relying on string matching.
owns: The typed error hierarchy for the template's deterministic repo scripts.
boundaries: This file defines script-layer error types only. Do not add application logic, UI concerns, or domain errors.
invariants: Every subclass must set a unique default code and preserve the base toJSON shape. Error messages must remain human-readable.
risks: Breaking the toJSON shape would silently corrupt structured --json output from all scripts that adopt typed errors.
securityPrivacy: Pure error definitions; no secrets, network access, or filesystem operations.
notesForLLM: Keep the hierarchy flat and minimal. Add a new subclass only when an existing one does not cover the failure category.
tests: tests/unit/script-errors.test.mjs
linkedDocs:
  - scripts/lib/README.md
  - scripts/checks/_shared.mjs
related:
  - scripts/checks/_shared.mjs
  - scripts/checks/architecture-check.mjs
  - scripts/checks/readme-check.mjs
---

# errors.mjs
