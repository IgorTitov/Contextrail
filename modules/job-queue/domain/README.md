<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for job-queue/domain.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/job-queue/domain/

Pure domain logic for the job-queue module. Framework-free, no infrastructure imports. Contains the job lifecycle state machine, retry/backoff math, and a pull-based worker loop.
