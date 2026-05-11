<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the domain layer of the task module.
@sidecar README.md.header.md
@layer module | @hex domain | @ctx task
@public false
@edit careful -->

# domain

Pure domain logic for tasks. Framework-free, no external dependencies.

- `task-lifecycle.mjs` -- `createTaskLifecycle()` state machine (pending, running, completed, failed, cancelled)
- `serialize.mjs` -- `serializeForTransfer()` prepares data for Worker postMessage
