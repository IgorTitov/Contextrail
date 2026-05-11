---
fileId: contextrail-template:modules:permission:messages
module: modules/permission
stability: evolving
steward: shared
api: file-local
boundedContext: permission
summary: i18n message registry for the permission module.
owns: All user-facing text for the permission module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the permission module must come from this registry.
notesForLLM: i18n layer for permission. Add new user-facing strings here, not inline in code.
messageKeys:
  - permission.port.invalid_adapter
  - permission.port.missing_method
  - permission.access_denied
  - permission.missing_user
  - permission.missing_check_fn
  - permission.missing_grant_fn
  - permission.missing_revoke_fn
linkedDocs: modules/permission/README.md
---

# messages.mjs
