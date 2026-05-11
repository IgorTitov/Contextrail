<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Adversarial 6-angle open-source publication readiness audit prompt.
@sidecar oss-release-readiness.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Open-Source Publication Readiness — Adversarial Review

You are a skeptical senior engineer evaluating **Contextrail** (COA template) for the first time. You have never seen this codebase. You've been asked: "Should we publish this on GitHub as an open-source project?"

Your job is to find every reason NOT to publish — and then weigh those against the strengths. Be honest, specific, and constructive. No cheerleading.

## Context

- Version: 0.5.1 (verify from `VERSION` file)
- License: Apache 2.0
- Author: single maintainer
- Target audience: teams adopting AI-assisted development with Claude Code or OpenAI Codex
- Claim: "agentable architecture" — 38 hex modules, ~2975 tests, 16 agents, 17 skills, zero-bundler build

## Your review has 6 angles. Do them in order.

---

### Angle 1: The Skeptical HackerNews Commenter

Read `README.md`, `docs/whitepaper.md`, and `CHANGELOG.md`. Then answer as if you're writing a HN comment:

1. What's the **one-sentence pitch** and does it land? Or is it buzzword soup?
2. What would make you click away in the first 30 seconds?
3. What would make you clone it and try it?
4. Is the README honest about limitations and trade-offs?
5. Is there anything that smells like "impressive scaffolding but no real substance"?
6. What's the ratio of process/methodology docs to actual working code? Is it healthy?

Be blunt. Quote specific lines that work or don't work.

---

### Angle 2: The Security Auditor

You're evaluating whether this template introduces risk for teams that adopt it.

1. **Dependency surface**: Read `package.json`. List every dependency (production and dev). For each, check:
   - Is it a well-known, actively maintained package?
   - Is the version pinned or ranged?
   - Any known CVEs? (check with `pnpm audit` if available)

2. **Code execution vectors**: Search for these patterns across ALL `.mjs` files in `modules/` and `apps/`:
   ```
   eval(
   new Function(
   innerHTML
   outerHTML
   document.write
   insertAdjacentHTML
   child_process
   exec(
   execSync(
   spawn(
   ```
   For each hit: is it safe? Is it documented? Could an adopter misuse it?

3. **Secrets and credentials**: Search tracked files for:
   ```
   sk-
   api_key
   password
   secret
   token
   Bearer
   -----BEGIN
   ```
   Exclude obvious test fixtures and placeholder examples. Flag anything suspicious.

4. **Git history secrets**: Run `git log --all --diff-filter=D -- '*.env' '*.key' '*.pem'` — were sensitive files ever tracked and then deleted?

5. **Supply chain**: Are there any `postinstall` scripts? Any binary downloads in dependencies? Any references to external URLs that get fetched at build/runtime?

6. **`.gitignore` completeness**: Does it cover `.env`, credentials, IDE files, OS files, build artifacts?

7. **SECURITY.md**: Does it exist? Does it explain how to report vulnerabilities? Is there a responsible disclosure process?

Report each finding as SAFE / CONCERN / BLOCKER with specific file paths and line numbers.

---

### Angle 3: The Open-Source Community Health Check

Evaluate GitHub publication readiness:

1. **Required files** — verify each exists and is meaningful (not placeholder):
   - `LICENSE` — is it a recognized OSS license? Is the copyright correct?
   - `README.md` — does it explain what, why, how?
   - `CONTRIBUTING.md` — does it explain how to contribute? Is it welcoming?
   - `CODE_OF_CONDUCT.md` — does it exist? Which standard?
   - `SECURITY.md` — vulnerability reporting process?
   - `CHANGELOG.md` — is it maintained? Does it follow Keep a Changelog or similar?
   - `.github/ISSUE_TEMPLATE/` — bug report and feature request templates?
   - `.github/pull_request_template.md` — PR template?
   - `.github/workflows/` — CI pipeline?

2. **CI pipeline review**: Read `.github/workflows/ci.yml`. Does it:
   - Run tests?
   - Run linting?
   - Run the project's own quality gates?
   - Work for external contributors (no secrets required for PRs)?

3. **Contributor friction**: If I fork this repo and submit a PR:
   - How many pre-commit hooks will I hit?
   - Will they all pass on a clean clone?
   - Is there documentation for when hooks fail?
   - Can I contribute without installing Claude Code?

4. **Bus factor mitigation**: What happens if the maintainer disappears?
   - Is the architecture documented well enough for someone else to maintain?
   - Are there hardcoded paths, names, or assumptions about the maintainer?
   - Is the project self-documenting or does it require institutional knowledge?

---

### Angle 4: The Adopter Who Actually Tries It

Simulate the first-hour experience. Do NOT skip steps — actually run the commands.

1. **Clone-to-tests**:
   ```bash
   pnpm install
   pnpm test
   ```
   Report: Did it work? How long? Any warnings? Any confusing output?

2. **Bootstrap**:
   ```bash
   node scripts/bootstrap.mjs --help
   node scripts/bootstrap.mjs --dry-run --name "TestApp" --key "TST" --module "core"
   ```
   Report: Is the output clear? Does dry-run show what would change?

3. **Run a starter app**: Try each starter and report what happens:
   ```bash
   pnpm build:hosted
   # Can you open dist/index.html in a browser?

   node apps/api-starter/app.mjs
   # Does it start? Can you curl the health endpoint?
   ```

4. **Quality gates**: Run all validation scripts. Do any fail on a clean checkout?
   ```bash
   node scripts/checks/header-check.mjs
   node scripts/checks/readme-check.mjs
   node scripts/checks/architecture-check.mjs
   node scripts/checks/spec-check.mjs
   node scripts/checks/test-gate.mjs
   ```

5. **Add a toy module**: Try to add a minimal new hex module following the documented process. How far do you get before hitting friction? What's unclear?

6. **Remove a module**: Try the documented detachment:
   ```bash
   node scripts/detach-module.mjs --list
   ```
   Does it work? Is the output clear?

---

### Angle 5: The Architecture Critic

You've seen many "hexagonal architecture" projects that are hex-in-name-only. Evaluate whether this one is genuine.

1. **Port contract enforcement**: Pick 3 modules. Read their port definitions. Are ports:
   - Real interfaces with method signatures, not just marker files?
   - Validated at runtime (assertion functions)?
   - Tested in contract tests?

2. **Adapter swappability**: For 2 modules with multiple adapters, verify:
   - Do adapters implement the same port contract?
   - Can you swap adapters without touching domain code?
   - Is DI used or are adapters hardwired?

3. **Domain purity**: Pick 3 domain files. Do they:
   - Import only from their own module?
   - Avoid infrastructure concerns (HTTP, DOM, FS, timers)?
   - Contain actual business logic (not just DTOs or pass-throughs)?

4. **Module independence**: Pick 2 modules. Could they be extracted into standalone npm packages without changing their internal code? What would need to change?

5. **The "template" test**: Is this actually a template (you clone and build on it) or a framework (you install and conform to it)? What's the evidence?

---

### Angle 6: What's Missing for v1.0?

Based on everything you've seen, what would need to change for this to be a credible v1.0 release?

Categorize into:
- **Must have** — blocking issues or missing fundamentals
- **Should have** — significant gaps that erode trust
- **Nice to have** — polish items

Be specific. "Better docs" is not actionable. "The getting-started guide doesn't explain how to add a route to api-starter" is.

---

## Output format

### Per-Angle Summary Table

| Angle | Verdict | Key Finding | Biggest Risk |
|-------|---------|-------------|--------------|
| 1. HN Commenter | ... | ... | ... |
| 2. Security | ... | ... | ... |
| 3. Community Health | ... | ... | ... |
| 4. Adopter Trial | ... | ... | ... |
| 5. Architecture | ... | ... | ... |
| 6. v1.0 Gap | ... | ... | ... |

### Blockers (must fix before publishing)

Numbered list with file paths.

### Concerns (should fix soon after publishing)

Numbered list with file paths.

### Final Verdict

PUBLISH / HOLD / REJECT — with one paragraph explaining why.

---

**Rules**:
- Do NOT fix anything. Report only.
- Be specific — file paths, line numbers, exact quotes.
- If a claim is made in docs, verify it against the code.
- If something is missing, say what's missing and where it should go.
- You have full read access to all files. Use it.
