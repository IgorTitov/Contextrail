---
fileId: contextrail-template:modules:user-management:public-api
module: modules/user-management
stability: evolving
steward: shared
api: "Public API"
boundedContext: user-management
summary: Single cross-module entry point for the user-management module.
owns: Single cross-module entry point for the user-management module.
boundaries: Stays inside the user-management bounded context. Do not couple to other modules' internals.
invariants: Bounded to the ${name} module.
notesForLLM: Only this file may be imported from other modules. Do not deep-import into domain/, ports/, or adapters/.
specRefs:
  - TPL-001
exports:
  - assertUserManagementPort
  - createInvitation
  - createMemoryUserManagementAdapter
  - createPasswordReset
  - getLocale
  - isTokenValid
  - registerLocale
  - registerUser
  - resetLocale
  - setLocale
  - t
  - updateProfile
  - verifyEmail
---

# public-api.mjs
