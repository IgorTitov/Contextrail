---
fileId: contextrail-template:modules:email:memory-email-adapter
module: modules/email
stability: evolving
steward: shared
api: Adapter
boundedContext: email
summary: In-memory EmailPort adapter — captures sent messages for tests and dev.
owns: createMemoryEmailAdapter — validates through the domain, stamps id + timestamp, stores records in a local array.
boundaries: Stays inside the email bounded context. Single-process only — not durable across restarts.
invariants: Implements the full EmailPort contract; isolates infrastructure; clocks and id generation are injectable for tests.
notesForLLM: Replace with an SMTP or HTTP adapter without touching consumers — EmailPort is the seam.
specRefs:
  - TPL-001
---

# memory-email-adapter.mjs
