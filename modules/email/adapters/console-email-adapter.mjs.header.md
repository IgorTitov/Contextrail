---
fileId: contextrail-template:modules:email:console-email-adapter
module: modules/email
stability: evolving
steward: shared
api: Adapter
boundedContext: email
summary: Console EmailPort adapter — validates messages and logs summaries instead of delivering them.
owns: createConsoleEmailAdapter — dev-mode default that logs a compact summary via an injectable log sink.
boundaries: Stays inside the email bounded context. Does not actually deliver mail; intended for development.
invariants: Implements the full EmailPort contract; record shape matches the memory adapter so callers can swap freely.
notesForLLM: Pair with the memory adapter in tests; replace with a real transport adapter in production.
specRefs:
  - TPL-001
---

# console-email-adapter.mjs
