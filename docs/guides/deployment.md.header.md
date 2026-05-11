---
fileId: contextrail-template:docs:guides:deployment
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/guides/platforms.md
  - docs/guides/pwa.md
  - scripts/build-single.mjs
  - package.json (pnpm scripts)
summary: "Build commands and hosting reference for all deployment modes: static, PWA, local, and Electron, plus custom build flag documentation."
owns: The canonical reference for all build commands, output structure, hosting configurations, and build script flags.
boundaries: Must not duplicate per-platform deep guides (pwa.md, electron.md). Deployment mechanics and hosting configs only — not runtime behavior or storage adapter selection.
invariants: Build command table must stay in sync with package.json pnpm scripts and build-single.mjs accepted flags. Output directory (dist/) must be accurately documented.
risks: Stale build commands or wrong flag names in this guide cause failed builds. The no-bundler note is load-bearing — document clearly so users do not add unnecessary tooling.
securityPrivacy: No secrets. Nginx config example should not be used as a production security template without TLS configuration.
notesForLLM: The build uses no bundler or transpiler — output is raw ES modules. Keep the build command table and custom flags (--mode, --out, --clean) aligned with scripts/build-single.mjs. The Electron mode produces dist/ for use inside the Electron scaffold, not a standalone executable.
linkedDocs:
  - docs/guides/platforms.md
  - docs/guides/pwa.md
  - docs/guides/local-app.md
specRefs: TPL-034
related:
  - docs/guides/platforms.md
  - docs/guides/pwa.md
  - docs/guides/local-app.md
  - docs/guides/README.md
---

# deployment.md
