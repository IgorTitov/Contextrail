---
fileId: contextrail-template:scripts:checks:header-exports-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Backfill the `exports:` list on every modules/<mod>/public-api sidecar by parsing real export statements.
owns: The deterministic public-API surface inventory derived from `export { … }`, `export const`, `export function`, and `export class` statements.
boundaries: Touches only `modules/<mod>/public-api.{mjs,cjs,js,ts}` sidecars. Replaces any existing `exports:` block in place rather than appending duplicates.
invariants: Re-running with no source changes produces no diff. Strips line and block comments before parsing so that example exports inside docstrings never leak into the list.
risks: Re-export of namespace bindings (`export * from …`) is not expanded — those names stay invisible. The right fix for a public-api that uses namespace re-exports is to switch to explicit named re-exports rather than to make this script smarter.
notesForLLM: Read this script before using grep to discover the API surface of a bounded module — the sidecar `exports:` field is the canonical answer.
tests: scripts/checks/header-check.mjs
related:
  - scripts/checks/header-implements-port-fill.mjs
  - scripts/checks/header-port-fill.mjs
  - scripts/checks/header-message-keys-fill.mjs
---

# header-exports-fill.mjs
