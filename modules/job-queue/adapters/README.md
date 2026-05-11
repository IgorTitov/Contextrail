<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for job-queue/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/job-queue/adapters/

Concrete `JobQueuePort` implementations. The default memory adapter is zero-dependency; sqlite / redis / postgres adapters can slot in behind the same port without touching consumers.
