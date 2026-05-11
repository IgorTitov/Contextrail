---
fileId: contextrail-template:modules:job-queue:public-api
module: modules/job-queue
stability: evolving
steward: shared
api: "Public API"
boundedContext: job-queue
summary: Single cross-module entry point for the job-queue module.
owns: Single cross-module entry point for the job-queue module.
boundaries: Stays inside the job-queue bounded context. Do not couple to other modules' internals.
invariants: Bounded to the job-queue module.
notesForLLM: Only this file may be imported from other modules. Do not deep-import into domain/, ports/, or adapters/.
specRefs:
  - TPL-001
exports:
  - assertJobQueuePort
  - createJob
  - createJobWorker
  - createMemoryJobQueue
  - exponentialBackoff
  - getLocale
  - isReady
  - markCompleted
  - markFailed
  - markRunning
  - registerLocale
  - resetLocale
  - setLocale
  - t
  - validateEnqueue
---

# public-api.mjs
