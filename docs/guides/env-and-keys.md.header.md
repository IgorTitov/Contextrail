---
fileId: contextrail-template:docs:guides:env-and-keys
module: docs/guides
stability: evolving
steward: shared
api: Guide document
dependsOn:
  - .env.example
  - .gitignore
summary: Document how to manage environment variables, private keys, and sensitive configuration in projects built from this template.
owns: The canonical guidance for environment variables and private key management.
boundaries: This file is a guide only. It must not contain real credential values or implementation code.
invariants: Guidance must stay aligned with .gitignore rules and .env.example content.
risks: Stale guidance could lead to credential values leaking into version control.
securityPrivacy: Documentation only. Must never contain real credential values.
notesForLLM: Reference this guide when the user asks about API keys, environment variables, or private key management.
linkedDocs:
  - .env.example
  - .gitignore
related: modules/auth/README.md
---

# env-and-keys.md
