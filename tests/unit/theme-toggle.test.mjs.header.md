---
fileId: contextrail-template:tests:unit:theme-toggle.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the theme-toggle module.
owns: Unit proof of the resolveTheme pure function covering explicit light, explicit dark, and system-preference fallback resolution paths.
boundaries: Must only test the resolveTheme function from apps/starter/theme-toggle/theme-toggle.mjs; must not test DOM class mutations, localStorage reads, or event wiring.
invariants: resolveTheme must be deterministic given the same inputs; all valid preference values ('light', 'dark', 'system') and the system-media-match flag must be covered by assertions.
notesForLLM: Keep tests limited to resolveTheme input/output pairs. DOM and storage side effects belong in integration or E2E tests. When new resolution logic is added, cover each new input combination with a separate test case.
tests: node:test runner via pnpm test:unit
specRefs: TPL-016
---

# theme-toggle.test.mjs
