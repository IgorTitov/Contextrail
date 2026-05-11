---
fileId: contextrail-template:modules:job-queue:memory-job-queue
module: modules/job-queue
stability: evolving
steward: shared
api: "Adapter"
boundedContext: job-queue
summary: In-memory JobQueuePort adapter with FIFO scheduling, retry, and exponential backoff.
owns: createMemoryJobQueue — Map-backed storage, isReady/markRunning/markFailed wiring, dequeue picks the oldest ready job.
boundaries: Stays inside the job-queue bounded context. Single-process only — durable across processes requires a different adapter.
invariants: Implements the full JobQueuePort contract; isolates infrastructure; clocks and id generation are injectable for tests.
notesForLLM: Replace with a distributed adapter (sqlite, redis, postgres LISTEN/NOTIFY) without touching consumers — the port is the seam.
specRefs:
  - TPL-001
---

# memory-job-queue.mjs
