---
fileId: contextrail-template:docs:guides:getting-started
module: docs/guides
stability: evolving
steward: shared
api: Documentation
summary: Document getting-started for this repository.
owns: Public onboarding path from clone and bootstrap to the first bounded slice, including orientation, runtime-shell selection, and entry links into local-LLM workflows.
boundaries: Must stay concise and practical. Link outward to whitepaper, SYSTEM_MAP, and narrower guides instead of duplicating deep platform or API reference material.
invariants: Step numbering must stay sequential. Commands must match actual scripts in package.json and scripts/.
risks: Stale commands if package.json scripts are renamed. Verify against actual scripts when updating.
securityPrivacy: No secrets.
notesForLLM: This is the primary public onboarding path. Keep steps concrete, current, and verifiable against actual repo scripts. Prefer the shortest realistic path to first successful evaluation.
linkedDocs:
  - docs/guides/README.md
  - docs/SYSTEM_MAP.md
  - docs/whitepaper.md
related:
  - docs/guides/local-frameworks.md
  - docs/guides/byollm-feature-dispatch.md
  - README.md
---

# getting-started.md
