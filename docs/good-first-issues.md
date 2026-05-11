<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Pre-written good-first-issue GitHub issues for community onboarding. Create with `gh issue create` after repo publication.
@sidecar good-first-issues.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Good First Issues

Pre-written GitHub issues for community onboarding. After publishing the repo, create them with the `gh` CLI commands below.

---

## Issue 1: Add `.header.md` sidecars to guide files missing them

**Labels:** `good first issue`, `docs`, `header-discipline`

Several files under `docs/guides/` were created without `.header.md` sidecar files. Run `node scripts/checks/header-check.mjs` to find them, then use `node scripts/checks/header-create.mjs <files...>` to generate sidecars. Verify with `header-check` afterward.

```bash
gh issue create \
  --title "Add missing .header.md sidecars to docs/guides/" \
  --label "good first issue,docs,header-discipline" \
  --body "Several files under \`docs/guides/\` are missing \`.header.md\` sidecar files (ADR-0009).

**How to find them:**
\`\`\`bash
node scripts/checks/header-check.mjs
\`\`\`

**How to fix:**
\`\`\`bash
node scripts/checks/header-create.mjs docs/guides/server-adapters.md docs/guides/parallel-work-quickstart.md
# ... repeat for each missing file
node scripts/checks/header-check.mjs  # verify
\`\`\`

**Acceptance:** \`header-check\` passes with no missing sidecar warnings for \`docs/guides/\`."
```

---

## Issue 2: Add contract tests for the `email` module adapters

**Labels:** `good first issue`, `testing`, `module:email`

The `email` module has `console-email-adapter.mjs` and `memory-email-adapter.mjs` but no contract tests verifying they satisfy the port interface. Write a shared contract test suite that runs against both adapters.

```bash
gh issue create \
  --title "Add contract tests for email module adapters" \
  --label "good first issue,testing,module:email" \
  --body "The \`email\` module has two adapters (\`console-email-adapter\`, \`memory-email-adapter\`) but no contract tests proving they satisfy \`EmailPort\`.

**What to do:**
1. Create \`tests/contract/email.contract.test.mjs\`
2. Write a shared test suite that exercises the port interface (send, verify delivery, error handling)
3. Run the suite against both adapters

**Reference:** See \`tests/contract/cache.contract.test.mjs\` for the pattern.
**Acceptance:** Both adapters pass the contract test suite."
```

---

## Issue 3: Add README.md to modules missing one

**Labels:** `good first issue`, `docs`

Some module directories are missing a `README.md`. Run the check script to find them, then add a short README describing the module's purpose and public API.

```bash
gh issue create \
  --title "Add README.md to modules missing one" \
  --label "good first issue,docs" \
  --body "Some \`modules/*/\` directories are missing a \`README.md\`.

**How to find them:**
\`\`\`bash
node scripts/checks/readme-check.mjs
\`\`\`

**How to fix:**
\`\`\`bash
node scripts/checks/readme-fix.mjs  # auto-generates stubs
# Then edit each generated README to add a meaningful description
\`\`\`

**Acceptance:** \`readme-check\` passes with no missing-README warnings for \`modules/\`."
```

---

## Issue 4: Replace hardcoded `data-testid` values in starter app

**Labels:** `good first issue`, `testing`, `app:starter`

The starter app (`apps/starter/`) may have hardcoded `data-testid` strings in templates and test files. These should come from the bounded `ui-selectors.mjs` registry instead.

```bash
gh issue create \
  --title "Move hardcoded data-testid values to ui-selectors registry" \
  --label "good first issue,testing,app:starter" \
  --body "Hardcoded \`data-testid\` strings in \`apps/starter/\` templates and tests should be centralized in \`apps/starter/ui-selectors.mjs\`.

**How to find them:**
\`\`\`bash
grep -r 'data-testid' apps/starter/ --include='*.html' --include='*.mjs'
\`\`\`

**What to do:**
1. Add missing selectors to \`apps/starter/ui-selectors.mjs\`
2. Import and use the registry values in templates and tests
3. Remove hardcoded strings

**Reference:** See \`docs/design/design-system.md\` for the UI selector pattern.
**Acceptance:** No hardcoded \`data-testid\` strings remain outside \`ui-selectors.mjs\`."
```

---

## Issue 5: Add i18n message keys for `onboarding` module

**Labels:** `good first issue`, `i18n`, `module:onboarding`

The `onboarding` module should externalize all user-facing strings through the i18n messages layer. Check if the module's adapters contain hardcoded user-facing copy and extract them to message keys.

```bash
gh issue create \
  --title "Externalize onboarding module copy through i18n" \
  --label "good first issue,i18n,module:onboarding" \
  --body "The \`onboarding\` module should use the \`i18n\` module for all user-facing copy instead of hardcoded strings.

**What to do:**
1. Check \`modules/onboarding/adapters/\` for hardcoded user-facing strings
2. Add message keys to \`modules/onboarding/messages.mjs\`
3. Replace hardcoded strings with \`t('onboarding.key')\` calls

**Reference:** See \`modules/auth/messages.mjs\` for the pattern.
**Acceptance:** No hardcoded user-facing strings in the onboarding module's adapter layer."
```

---

## Issue 6: Write a Gherkin scenario for the greeter example module

**Labels:** `good first issue`, `testing`, `bdd`, `module:example-greeter`

The `example-greeter` module is a teaching example. It needs a simple `.feature` file demonstrating BDD conventions.

```bash
gh issue create \
  --title "Add Gherkin BDD scenario for example-greeter module" \
  --label "good first issue,testing,bdd,module:example-greeter" \
  --body "The \`example-greeter\` module needs a \`.feature\` file demonstrating BDD conventions.

**What to do:**
1. Create \`tests/bdd/features/example-greeter.feature\`
2. Write 2-3 scenarios (greet a known user, greet an unknown user, greet with locale)
3. Add step definitions in \`tests/bdd/steps/example-greeter.steps.mjs\`

**Reference:** See \`tests/bdd/\` for existing patterns and \`.claude/rules/testing.md\` for BDD conventions.
**Acceptance:** \`pnpm test:bdd\` passes with the new scenarios."
```

---

## Issue 7: Improve error messages in architecture-check.mjs

**Labels:** `good first issue`, `dx`, `tooling`

The architecture check script reports violations but the error messages could be more actionable — include the fix suggestion alongside the violation.

```bash
gh issue create \
  --title "Add fix suggestions to architecture-check error messages" \
  --label "good first issue,dx,tooling" \
  --body "The architecture check (\`scripts/checks/architecture-check.mjs\`) reports violations but doesn't suggest fixes.

**Examples of improvement:**
- \`deep module import is forbidden\` → add: \`Import from modules/X/public-api.mjs instead\`
- \`domain layer must not import framework dependency\` → add: \`Move this import to an adapter\`
- \`relative import crosses module boundary\` → add: \`Use the target module's public-api.mjs\`

**Acceptance:** Each error message includes an actionable fix suggestion."
```

---

## Batch creation script

After publishing the repo, run all commands above, or use this helper:

```bash
# Create all labels first
gh label create "header-discipline" --color "c5def5" --description "Header/sidecar discipline"
gh label create "module:email" --color "bfd4f2" --description "email module"
gh label create "module:onboarding" --color "bfd4f2" --description "onboarding module"
gh label create "module:example-greeter" --color "bfd4f2" --description "example-greeter module"
gh label create "app:starter" --color "d4c5f9" --description "starter app"
gh label create "dx" --color "fbca04" --description "Developer experience"
gh label create "tooling" --color "e6e6e6" --description "Build/check tooling"
gh label create "bdd" --color "0e8a16" --description "BDD/Gherkin tests"
gh label create "i18n" --color "006b75" --description "Internationalization"
```
