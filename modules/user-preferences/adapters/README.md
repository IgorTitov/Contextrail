<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the adapters layer of the user-preferences module.
@sidecar README.md.header.md
@layer module | @hex adapter | @ctx user-preferences
@public false
@edit careful -->

<!--
SpecRefs: TPL-029
-->

# adapters

Concrete implementations of the StoragePort contract.

- `memory-adapter.mjs` — In-memory adapter for testing and SSR fallback
- `local-storage-adapter.mjs` — Browser localStorage adapter
- `indexeddb-adapter.mjs` — IndexedDB adapter for Electron, Capacitor, and environments where localStorage may be unreliable
