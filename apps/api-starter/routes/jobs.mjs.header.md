---
fileId: contextrail-template:apps:api-starter:routes:jobs
module: apps/api-starter/routes
stability: evolving
steward: shared
api: "Route"
boundedContext: job-queue
summary: Demo routes that enqueue, list, and drain background jobs via the job-queue module.
owns: enqueueJobHandler, listJobsHandler, runJobsHandler — thin adapters over ctx.jobQueue / ctx.jobWorker.
boundaries: Stays in the api-starter app layer. Imports from modules/job-queue/public-api.mjs only (indirectly via ctx).
invariants: No direct network or filesystem I/O — handlers return plain JSON derived from the queue state.
notesForLLM: Good starting point for building real background workflows (email, webhooks, fan-out). Replace the demo handler with real business logic.
specRefs:
  - TPL-001
  - TPL-177
---

# jobs.mjs
