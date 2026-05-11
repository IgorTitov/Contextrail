---
fileId: contextrail-template:tests:unit:job-queue
module: tests/unit
stability: evolving
steward: shared
api: "Test"
boundedContext: job-queue
summary: Unit proof for the job-queue bounded module — lifecycle, retry/backoff, worker loop.
owns: Unit tests for job-queue domain functions, memory adapter, port validator, and worker loop behavior.
boundaries: Uses public-api.mjs only; never deep-imports into domain/ports/adapters.
invariants: Deterministic — injected clocks and backoff, no timers, no real I/O.
notesForLLM: When adding new behavior, extend these tests first and keep them framework-free.
specRefs:
  - TPL-001
---

# job-queue.test.mjs
