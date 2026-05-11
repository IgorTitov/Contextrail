---
fileId: contextrail-template:apps:api-starter:routes:email
module: apps/api-starter/routes
stability: evolving
steward: shared
api: Route
boundedContext: api-starter
summary: Email demo route — validates and enqueues outbound messages through the job queue.
owns: sendEmailHandler and listEmailHandler wiring on top of email and job-queue public APIs.
boundaries: App-layer route glue only. Delegates validation and delivery to modules/email and modules/job-queue.
invariants: Validates via createEmailMessage before enqueue so bad payloads fail at the HTTP boundary.
notesForLLM: Replace the memory mailer with an SMTP/HTTP adapter in production; the port is the seam.
specRefs:
  - TPL-177
---

# email.mjs
