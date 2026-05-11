---
fileId: contextrail-template:docs:guides:server-deployment
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn: apps/api-starter/app.mjs
summary: Guide for deploying server-side applications built with Contextrail hex modules, covering the api-starter app shell and custom server apps.
owns: The canonical server deployment guide for hex-module-based server applications.
boundaries: Covers deployment patterns only. Does not define the api-starter implementation.
invariants: Deployment steps must match actual api-starter app structure and config.
risks: Drift if api-starter changes its startup or config surface.
securityPrivacy: No secrets. Remind deployers to use environment variables for sensitive config.
notesForLLM: Reference this when a user asks how to deploy a server-side COA application.
linkedDocs: docs/guides/framework-integration.md
related: apps/api-starter/README.md
---

# server-deployment.md
