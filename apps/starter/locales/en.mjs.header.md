---
fileId: contextrail-template:apps:starter:locales:en
module: apps/starter
stability: evolving
steward: shared
api: "{ en }"
owns: The English message key catalog; serves as the default/fallback locale.
boundaries: Must only contain string key/value pairs. Must not import or execute application logic. Must remain the source-of-truth key set that other locales mirror.
invariants: Every key present in en.mjs must also exist in ru.mjs (and any future locale). No key may be silently removed without updating all locale files.
risks: Adding a key here without adding it to ru.mjs causes runtime missing-key warnings for Russian users.
securityPrivacy: Static strings only; no secrets.
notesForLLM: This is the canonical key namespace. When adding new keys, mirror them in ru.mjs immediately. PWA keys are grouped under the "// PWA" comment section.
linkedDocs: apps/starter/README.md
specRefs: TPL-028
related:
  - apps/starter/locales/ru.mjs
  - apps/starter/i18n.mjs
summary: En for the starter app.
---

# en.mjs
