---
fileId: contextrail-template:modules:auth:messages
module: modules/auth
stability: evolving
steward: shared
api: module-public
boundedContext: auth
owns: All user-facing string literals used by auth adapters and domain logic; locale-keyed message map; getMessage accessor.
boundaries: Must not import auth logic or port contracts. Must not grow into a general translation framework. Auth adapters must not hardcode user-facing strings outside this file.
invariants: Every locale must define the same set of message keys; the default locale must always be present; getMessage must not throw for any key defined in the default locale.
risks: Missing keys in non-default locales cause runtime errors when locale is switched; inconsistent key sets across locales are only caught at runtime without a key-coverage check.
notesForLLM: Add new keys to all locale blocks simultaneously. Keep message keys stable — renaming a key is a breaking change for any adapter already referencing it.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-062
related: modules/auth/public-api.mjs
summary: i18n message registry for the auth module.
messageKeys:
  - auth.login.missing_credentials
  - auth.login.invalid_credentials
  - auth.register.missing_fields
  - auth.register.user_exists
  - auth.guard.not_authenticated
  - auth.guard.insufficient_role
  - auth.jwt.verification_failed
  - auth.jwt.token_expired
  - auth.jwt.refresh_unavailable
  - auth.jwt.refresh_failed
---

# messages.mjs
