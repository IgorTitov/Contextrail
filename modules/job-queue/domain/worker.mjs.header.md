---
fileId: contextrail-template:modules:job-queue:worker
module: modules/job-queue
stability: evolving
steward: shared
api: "Domain"
boundedContext: job-queue
summary: Framework-free pull-based worker loop that drives any JobQueuePort with a handler map.
owns: createJobWorker — runOnce / runUntilEmpty — routes dequeued jobs to handlers, reports completions / retries / dead-letters.
boundaries: Stays inside the job-queue bounded context. Must not own timers; the host app decides when to tick.
invariants: Pull-based only. Errors are captured and routed through queue.fail — handlers never leak exceptions out of the worker.
notesForLLM: Do not add setInterval or setTimeout here. The worker must remain deterministic for tests.
specRefs:
  - TPL-001
---

# worker.mjs
