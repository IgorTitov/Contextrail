<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the adapters layer of the notifications module.
@sidecar README.md.header.md
@layer module | @hex adapter | @ctx notifications
@public false
@edit careful -->

# adapters

Concrete implementations of the NotificationPort contract.

- `memory-adapter.mjs` — In-memory adapter for testing
- `dom-adapter.mjs` — Browser DOM adapter with ARIA live region and auto-dismiss
