---
fileId: contextrail-template:apps:starter:icons:icon-512.svg
module: apps/starter
stability: evolving
steward: human
api: SVG image asset
owns: The 512x512 app icon visual.
boundaries: Must be a valid SVG. Must not contain embedded scripts or external references. Must remain at 512x512 viewBox for manifest compliance.
invariants: File must exist at this path; manifest.json and pwa-manifest.test.mjs both reference it by name.
risks: Deleting or renaming this file breaks the manifest icon reference and causes PWA installability failure.
securityPrivacy: Static SVG; no embedded scripts.
notesForLLM: This is a placeholder icon showing an "S" on a blue background. Replace with the actual app icon when customizing. This file uses a sidecar because SVG with embedded XML comments can cause rendering issues in some consumers.
tests: tests/unit/pwa-manifest.test.mjs
linkedDocs: apps/starter/manifest.json.header.md
specRefs: TPL-026
related: apps/starter/manifest.json
summary: Icon 512 for the starter app.
---

# icon-512.svg
