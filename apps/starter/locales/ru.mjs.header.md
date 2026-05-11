---
fileId: contextrail-template:apps:starter:locales:ru
module: apps/starter
stability: evolving
steward: shared
api: "{ ru }"
owns: The Russian translation of every message key defined in en.mjs.
boundaries: Must only contain string key/value pairs. Must not import or execute application logic. Key set must mirror en.mjs exactly.
invariants: Every key present in en.mjs must have a corresponding entry here. Missing keys fall through to the en.mjs fallback at runtime, masking translation gaps.
risks: A key present in en.mjs but absent here silently falls back to English rather than surfacing a missing-translation error.
securityPrivacy: Static strings only; no secrets.
notesForLLM: When en.mjs gains a new key, add the Russian translation here in the same comment-section group. PWA keys are grouped under the "// PWA" comment section.
linkedDocs: apps/starter/README.md
specRefs: TPL-028
related:
  - apps/starter/locales/en.mjs
  - apps/starter/i18n.mjs
summary: Ru for the starter app.
---

# ru.mjs
