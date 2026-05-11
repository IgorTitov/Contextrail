<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the adapters layer of the task module.
@sidecar README.md.header.md
@layer module | @hex adapter | @ctx task
@public false
@edit careful -->

# adapters

Concrete implementations of the TaskPort contract.

- `main-thread-adapter.mjs` -- Main-thread adapter for environments without Workers
- `web-worker-adapter.mjs` -- Web Worker pool adapter for parallel execution
