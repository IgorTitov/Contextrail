<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define modular, non-brittle BDD conventions that align with Context-Optimized Architecture and hexagonal module boundaries.
@sidecar bdd-conventions.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# BDD conventions

Modular, non-brittle behavior-driven tests aligned with the template's Context-Optimized Architecture (COA) and hexagonal module boundaries.

**Concise enforceable rules:** [.claude/rules/testing.md](../../.claude/rules/testing.md)
**Selector registry pattern:** [design-system.md](design-system.md)
**COA reference:** [Context Loading Protocol](../context-loading-protocol.md)

---

## 1. File organization

### One feature file per module or flow

```
tests/bdd/
  features/
    example-greeter.feature      # one module = one feature file
    auth-login.feature           # one user flow = one feature file
    auth-password-reset.feature  # separate flow = separate file
  example-greeter.test.mjs       # step runner for the feature
  auth-login.test.mjs
  auth-password-reset.test.mjs
  shared/                        # bounded reusable steps
    navigation-steps.mjs
    form-steps.mjs
```

**Rules:**

- Feature file names match the module or flow they prove, not a generic "app.feature".
- Each `.feature` file has exactly one `Feature:` block.
- Step definition files sit next to features, not in a deep nested folder.
- When a module is detached from the monolith, its `.feature` + step runner detach cleanly with it.

### COA budget constraint

Each `.feature` file + its step definitions must fit within **4K-8K tokens** as a file-size discipline rule — keeping test files small, modular, and independently loadable alongside the module's own metadata.

Typical budget:

```
Feature file            ~200-400 tokens
Step definitions        ~400-800 tokens
Shared steps (loaded)   ~200-400 tokens
────────────────────────────────────────
BDD surface total       ~800-1,600 tokens
```

If a feature file grows beyond ~30 scenarios, split it into separate flow files.

---

## 2. Scenario authoring

### Domain language, not implementation

Scenarios describe **what the user sees and does**, not how the code works.

```gherkin
# Good — domain language
Scenario: User receives a personalised greeting
  Given the user is logged in as "Alice"
  When the greeting page loads
  Then the user sees "Hello, Alice!"

# Bad — implementation detail
Scenario: Greeting div renders with correct class
  Given the greet() function is called with "Alice"
  When the DOM updates
  Then the element with class .greeting-text has innerText "Hello, Alice!"
```

### Scenario independence

Each scenario must work in isolation:

- **No shared mutable state** between scenarios — each starts from a clean context.
- **No ordering dependencies** — scenarios can run in any order or in parallel.
- **Setup in Given steps** — all preconditions are explicit, not inherited from a previous scenario.

### Scenario Outline for data variations

Use `Scenario Outline` + `Examples` for the same behavior with different data, not copy-pasted scenarios:

```gherkin
Scenario Outline: Greeting with different names
  Given the default greeting adapter is active
  When I greet "<name>"
  Then the result should be "<expected>"

  Examples:
    | name    | expected       |
    | Alice   | Hello, Alice!  |
    | Bob     | Hello, Bob!    |
```

### Background for shared preconditions

Use `Background` to avoid repeating the same Given in every scenario within one feature:

```gherkin
Feature: Authenticated user actions

  Background:
    Given the user is logged in as "Alice"

  Scenario: View dashboard
    When the user opens the dashboard
    Then the user sees the welcome message

  Scenario: Change preferences
    When the user opens settings
    Then the user can toggle dark mode
```

---

## 3. Selector strategy

### Registry-first selectors

All DOM selectors in BDD step definitions must come from the bounded `ui-selectors` registry, not from hardcoded strings.

```javascript
// Good — selector from registry
import { sel } from '../../apps/starter/ui-selectors.mjs';

// step definition
const greeting = page.locator(sel.greeter.message);

// Bad — hardcoded selector
const greeting = page.locator('[data-testid="greeting-message"]');
```

**Why this matters for BDD:**

| Problem | Without registry | With registry |
|---------|-----------------|---------------|
| Selector changes | Fix in every step file + feature file | Fix once in registry |
| New component | Invent testid on the spot | Add to registry, import everywhere |
| Module detachment | Hunt for scattered selectors | Registry detaches with the module |
| Agent context | Agent must read templates to find selectors | Agent reads registry header only |

### Registry scoping

Keep selector registries bounded to their feature area:

- `apps/starter/ui-selectors.mjs` — starter app selectors
- `modules/auth/ui-selectors.mjs` — auth module selectors (if the module owns UI)

Do not create one giant global selector file.

---

## 4. Test data patterns

### Builders over fixtures

Use builder functions that construct test data with sensible defaults and optional overrides:

```javascript
// Good — builder with defaults
function buildUser(overrides = {}) {
  return { name: 'Test User', email: 'test@example.com', ...overrides };
}

// Usage in step definition
const user = buildUser({ name: 'Alice' });

// Bad — hardcoded fixture
const user = { name: 'Alice', email: 'alice@test.com', role: 'admin', createdAt: '2026-01-01' };
```

**Why builders:**

- Adding a new field to the model doesn't break every test — builder provides the default.
- Tests only specify the data relevant to their scenario.
- Builders document which fields matter for each behavior.

### No database or external state in BDD

BDD scenarios prove user-visible behavior through the public API or UI interaction layer. They do not set up database rows, write files, or call internal services directly.

If a scenario needs backend state, express it through a Given step that uses the module's public API:

```javascript
// Good — uses public API
steps.given('a saved preference for dark mode', async () => {
  await userPreferences.save({ theme: 'dark' });
});

// Bad — directly writes storage
steps.given('a saved preference for dark mode', async () => {
  localStorage.setItem('prefs', JSON.stringify({ theme: 'dark' }));
});
```

---

## 5. Step definition reuse

### Bounded shared steps

Reusable steps live in `tests/bdd/shared/` scoped by concern:

```
tests/bdd/shared/
  navigation-steps.mjs   # "When the user navigates to {path}"
  form-steps.mjs          # "When the user fills in {field} with {value}"
  assertion-steps.mjs     # "Then the user sees {text}"
```

**Rules:**

- Each shared-step file covers one narrow concern.
- Shared steps import from `ui-selectors` registries, not hardcoded selectors.
- A step file should not exceed ~50 step definitions — split by concern if it grows.
- Shared steps are opt-in imports, not a global auto-loaded step library.

### Step naming conventions

```gherkin
Given the user is logged in as "{name}"     # actor + state
When the user clicks "{button}"              # actor + action
Then the user sees "{text}"                  # actor + observable outcome
Then the page title is "{title}"             # observable + value
```

Prefer "the user" as the actor for consistency. Avoid passive voice ("a greeting is displayed").

---

## 6. COA alignment

### Why BDD must be modular

In a COA-compatible repository, an AI agent works on one module at a time within a 16K context window. If BDD tests are monolithic:

- The agent cannot load the full test surface for its target module.
- Changing one module's behavior requires reading unrelated scenarios.
- Module detachment breaks BDD tests that span multiple modules.

### Agent workflow for BDD

An agent editing BDD follows this loading sequence:

```
1. SYSTEM_MAP.md                 ~1900 tok (~950 focused)
2. Target module manifest.json   ~1000 tok (incl. capabilities)
3. Target .feature file           ~300 tok
4. Target step runner             ~500 tok
5. Shared steps (if imported)     ~300 tok
6. Source file being changed     ~1500 tok
───────────────────────────────────────────
Total                           ~4,650 tok  (fits in 6K-8K)
```

This only works if each feature file is bounded to one module.

### Module detachment compatibility

When a module is detached using the module detachment CLI:

- Its `.feature` file under `tests/bdd/features/` goes with it.
- Its step runner under `tests/bdd/` goes with it.
- Shared steps that it imports stay in the monolith (they are general-purpose).
- Selectors from the module's `ui-selectors.mjs` go with it.

This clean detachment is only possible when features are scoped to modules.

---

## 7. Visible E2E walkthrough (exception)

A dedicated **cross-module walkthrough** scenario is exempt from the one-module-per-feature rule. This is a single end-to-end flow that chains all key user actions across modules in one headed browser session for visual verification.

### Why the exception exists

Modular BDD proves that each module's behavior is correct in isolation. But a human reviewer also needs to see the full application flow working end-to-end in a real browser — login, navigate, act, verify, logout — without stopping between modules.

### Rules for the walkthrough

- Lives in `tests/e2e/`, **not** in `tests/bdd/`. The two layers have different purposes.
- One walkthrough file per application entry point (e.g., `tests/e2e/walkthrough.spec.mjs`).
- Scenarios in the walkthrough are intentionally sequential and stateful — the browser session carries forward.
- Selectors still come from `ui-selectors` registries.
- The walkthrough is a supplementary visual smoke pass, not the primary proving layer. Modular BDD under `tests/bdd/` remains the authority for behavior correctness.
- An agent does **not** need to fit the walkthrough in a single module's budget — this file is maintained as a whole, not per-module.
- Run with `pnpm e2e:headed` for the visual experience.

### Relationship to modular BDD

```text
tests/bdd/                          tests/e2e/
├── features/                       ├── walkthrough.spec.mjs  ← cross-module, sequential
│   ├── auth-login.feature          └── ...
│   ├── greeter.feature
│   └── ...                         Primary purpose:
├── auth-login.test.mjs             Visual smoke — "does the whole app hold together?"
├── greeter.test.mjs
└── shared/                         Primary purpose:
    └── ...                         Behavioral proof — "does each module work correctly?"
```

The walkthrough does not replace modular BDD. If a walkthrough step fails, the root cause is diagnosed through the relevant module's modular BDD tests, not by debugging the walkthrough itself.

---

## 8. Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| **God feature file** — one `.feature` with 100+ scenarios | Exceeds agent context budget; unrelated scenarios break together | Split by module or user flow |
| **Global step registry** — all steps in one file | Every change risks collisions; impossible to load partially | Scope shared steps by concern |
| **Hardcoded selectors** — `[data-testid="foo"]` in step code | Selector changes break N files independently | Use `ui-selectors` registry |
| **Scenario chaining** — Scenario B depends on Scenario A's state | Parallel execution fails; debugging one scenario requires running others | Each scenario starts clean |
| **Implementation language** — "the Redux store contains..." | Couples to internals; breaks on refactor | Use domain language only |
| **Fixture coupling** — hardcoded `{ id: 1, name: 'Alice', ... }` | Model changes break all tests | Use builders with defaults |
| **Cross-module scenarios in `tests/bdd/`** — one BDD scenario touches auth + chat + state | Breaks module boundaries; can't detach cleanly | One scenario, one module's behavior. Cross-module walkthroughs belong in `tests/e2e/` only (see section 7) |
| **Selector invention** — step definition creates a new `data-testid` | Scattered selectors, no single source of truth | Add to registry first, then use |

---

## Related documents

- [Testing rules](../../.claude/rules/testing.md) — concise enforceable rules
- [BDD-Playwright skill](../../.claude/skills/bdd-playwright/SKILL.md) — agent skill for BDD work
- [Design system](design-system.md) — UI selector registry pattern
- [Context Loading Protocol](../context-loading-protocol.md) — COA agent loading sequences
- [Example greeter feature](../../tests/bdd/features/example-greeter.feature) — reference implementation
