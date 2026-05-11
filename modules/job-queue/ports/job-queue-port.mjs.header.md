---
fileId: contextrail-template:modules:job-queue:job-queue-port
module: modules/job-queue
stability: evolving
steward: shared
api: "Port"
boundedContext: job-queue
summary: Port contract that adapters must satisfy for the job-queue module.
owns: JobQueuePort typedef + assertJobQueuePort runtime validation helper.
boundaries: Stays inside the job-queue bounded context. Contract definition only; no implementation.
invariants: All six methods (enqueue, dequeue, complete, fail, list, size) must be present on any conforming adapter.
notesForLLM: Ports define what the domain needs, not how it is provided. Add typedef shapes here when you grow the contract.
specRefs:
  - TPL-001
---

# job-queue-port.mjs
