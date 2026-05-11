---
fileId: contextrail-template:tests:unit:email
module: tests/unit
stability: evolving
steward: shared
api: Tests
boundedContext: email
summary: Unit proof for the email module — validation, adapters, record shape.
owns: Test cases for createEmailMessage, isValidEmailAddress, normalizeRecipients, assertEmailPort, memory adapter, console adapter.
boundaries: Uses public-api.mjs only. No deep imports into domain/ports/adapters.
invariants: Every public-api.mjs function exercised here must remain covered by at least one assertion.
notesForLLM: Add a new test alongside each public export addition.
specRefs:
  - TPL-001
---

# email.test.mjs
