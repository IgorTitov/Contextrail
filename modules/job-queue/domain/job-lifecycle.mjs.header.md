---
fileId: contextrail-template:modules:job-queue:job-lifecycle
module: modules/job-queue
stability: evolving
steward: shared
api: "Domain"
boundedContext: job-queue
summary: Pure job lifecycle — state transitions, retry decision, exponential backoff.
owns: Pure functions that move a job through pending → running → completed/failed and compute retry delay.
boundaries: Stays inside the job-queue bounded context. No I/O, no timers, no imports from adapters/.
invariants: Pure functions only. Clocks and backoff policy are injected by adapters.
notesForLLM: Domain stays framework-free. Do not import from adapters/ or infrastructure.
specRefs:
  - TPL-001
---

# job-lifecycle.mjs
