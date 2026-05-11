<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for job-queue/ports.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/job-queue/ports/

Port contracts that adapters must satisfy. The `JobQueuePort` defines the 6-method surface used by the worker loop and any other consumer.
