---
fileId: contextrail-template:scripts:checks:header-implements-port-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Backfill implementsPort on adapter sidecars by parsing each adapter's `../ports/<name>-port` import.
owns: The deterministic adapter→port pairing rule that reads the import statement instead of guessing from filenames.
boundaries: Additive only. Skips sidecars that already declare implementsPort. Touches only adapter files under modules/<mod>/adapters/. Skips .d.ts re-export shims.
invariants: Idempotent. Only writes a port basename that is physically referenced by the adapter source — never invents one.
risks: An adapter that intentionally implements multiple ports will be tagged with only the first match. The right fix is to edit that sidecar by hand rather than to make this script smarter.
notesForLLM: This script is the canonical answer to "which port does this adapter implement" — read its output before grepping adapter source for that information.
tests: scripts/checks/header-check.mjs
related:
  - scripts/checks/header-port-fill.mjs
  - scripts/checks/header-message-keys-fill.mjs
  - scripts/checks/header-linked-docs-fill.mjs
---

# header-implements-port-fill.mjs
