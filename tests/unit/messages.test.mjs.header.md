---
fileId: contextrail-template:tests:unit:messages.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the messages module.
owns: "Unit proof of the i18n messages layer: t() lookup and interpolation, locale switching, locale registration, and resetLocale() teardown in apps/starter/messages.mjs."
boundaries: Must not test UI rendering, network calls, or filesystem I/O; messages module contract only.
invariants: afterEach resetLocale() must keep tests isolated; t() must return the raw key for unknown keys; setLocale() must throw for unregistered locales.
risks: Missing afterEach cleanup would leak registered locales and cause false positives across test describe blocks.
notesForLLM: resetLocale() is called in afterEach to ensure locale isolation; every new locale registered inside a test must rely on this teardown.
tests:
  - pnpm test:unit
  - node --test tests/unit/messages.test.mjs
related: apps/starter/messages.mjs
---

# messages.test.mjs
