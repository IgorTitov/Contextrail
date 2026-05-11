---
fileId: contextrail-template:templates:capacitor:README
module: templates/capacitor
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - templates/capacitor/capacitor.config.json
  - docs/guides/platforms.md
owns: Entry-level usage documentation for the Capacitor scaffold directory.
boundaries: Must not duplicate detailed Capacitor plugin documentation. Should stay focused on the scaffold usage pattern and link to the full guide.
invariants: Build command (pnpm build:hosted) and webDir (dist) must stay in sync with capacitor.config.json and actual build output.
risks: Wrong build command or mismatched webDir will produce a blank or broken native WebView at runtime.
securityPrivacy: No secrets. androidScheme https is a security requirement for Capacitor 4+.
notesForLLM: The build command is pnpm build:hosted (not build:local). webDir in capacitor.config.json must match the pnpm build output directory. npx cap sync must be run after every build to push web assets to native projects.
linkedDocs:
  - docs/guides/platforms.md
  - templates/capacitor/capacitor.config.json
specRefs: TPL-033
related:
  - templates/capacitor/capacitor.config.json
  - docs/guides/platforms.md
summary: Setup and deployment guide for the capacitor platform template.
---

# README.md
