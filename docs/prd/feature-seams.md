<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the Feature Seams hex module that provides a formal mechanism for Branch by Abstraction and Trunk-Based Development.
@sidecar feature-seams.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Feature Seams Module

## Requirement intent

The repository uses Trunk-Based Development with Branch by Abstraction as its delivery model. Today this is enforced by convention and documentation only. The template needs a formal, safe, reusable mechanism that allows developers and AI agents to introduce new behavior behind feature seams, test both the old and new paths, switch the default when proof is green, and clean up stale seams — all on trunk.

The feature-seams module provides this mechanism as a proper hex module under `modules/feature-seams/`, following the same port/adapter pattern as other hex modules in the repository.

## Classification

This is **technical/architectural** work. It provides developer and agent infrastructure for safe delivery on trunk. It does not alter user-facing workflows. USM is intentionally skipped.

## Deliverables in scope (Slice 5)

### 1. SeamPort Interface and Domain Model (TPL-037)

Hex port and domain at `modules/feature-seams/`.

**SeamPort interface:**

- `isEnabled(flag)` — returns whether the named seam is currently active
- `register(flag, config)` — registers a new seam with metadata
- `enable(flag)` — switches a seam to the active (new path) state
- `disable(flag)` — switches a seam to the disabled (old path) state
- `list()` — returns all registered seams with their current state
- `remove(flag)` — removes a seam registration entirely

**Seam states:**

- `active` — the new path is the default
- `shadow` — both paths run, but the old path wins (for comparison/testing)
- `disabled` — the old path is the default

**Seam metadata:**

- `owner` — who introduced the seam (developer, agent, team)
- `created` — when the seam was registered
- `description` — human-readable purpose

Constraints: The port must be framework-free and testable in isolation. The domain model must enforce valid state transitions.

### 2. Memory Adapter (TPL-038)

Default adapter at `modules/feature-seams/adapters/memory-adapter.mjs`.

- In-memory seam registry implementing the SeamPort interface
- Suitable for testing and ephemeral contexts where persistence is not needed
- Stateless across process restarts (intentional for the default adapter)

Constraints: Must conform to the SeamPort interface. Must pass the runtime port assertion.

### 3. Config Adapter (TPL-039)

Persistent adapter at `modules/feature-seams/adapters/config-adapter.mjs`.

- Reads and writes seam state from a JSON configuration file or integrates with the app-config module
- Provides persistence across process restarts
- Falls back to an empty registry when the config source is missing or unreadable

Constraints: Must conform to the SeamPort interface. Must pass the runtime port assertion. Must degrade gracefully when the backing file is missing. Must not write to the config source unless explicitly instructed (read-only mode by default).

### 4. Guard Helpers and Runtime Port Assertion (TPL-040)

Guard helper at `modules/feature-seams/guards.mjs` and port assertion at `modules/feature-seams/ports/assert-seam-port.mjs`.

**Guard helper:**

- `whenEnabled(flag, newPath, oldPath)` — calls `isEnabled(flag)` on the active adapter and returns the result of the appropriate branch function
- Both `newPath` and `oldPath` are callable functions so the guard can run the right one lazily
- In `shadow` mode, both functions run but the old path result is returned

**Runtime port assertion:**

- `assertSeamPort(adapter)` — verifies at runtime that an adapter implements all required SeamPort methods
- Throws a clear error naming the missing method when the assertion fails

Constraints: Guard helpers must be pure functions that take the adapter as a parameter (no global state). The port assertion must be usable during adapter wiring, not just in tests.

### 5. JSDoc Typedefs and Type Sidecar (TPL-041)

Type definitions at `modules/feature-seams/types.d.ts` with JSDoc typedefs in source files.

- `.d.ts` sidecar file defines TypeScript-compatible interfaces for SeamPort, SeamConfig, SeamState, and SeamMetadata
- JSDoc `@typedef` and `@param` annotations in all source `.mjs` files reference the sidecar types
- Establishes the typing pattern that all future hex modules in the template should follow

Constraints: Types must be accurate reflections of the runtime API. The `.d.ts` file must not introduce TypeScript build requirements — it exists for editor tooling and documentation only.

### 6. Public API and Seam Audit Script (TPL-042)

Public API at `modules/feature-seams/public-api.mjs` and audit script at `scripts/checks/seam-audit.mjs`.

**Public API:**

- Exports only the port interface, factory function (creates an adapter instance), and guard helpers
- Does not expose adapter internals or domain implementation details
- Follows the same cross-module boundary convention as other hex modules

**Seam audit script:**

- Finds all seam registrations across the codebase by scanning for `register(` calls or equivalent patterns
- Reports each seam's flag name, state, owner, and creation date
- Warns about stale seams (older than a configurable threshold, default 30 days)
- Warns about orphaned seams (registered but never referenced in guard calls)
- Exits with a non-zero code when warnings are present (suitable for CI gating)

Constraints: The audit script must be runnable as `node scripts/checks/seam-audit.mjs`. It must not require the application to be running. It must use static analysis (file scanning), not runtime introspection.

## Out of scope

- UI for managing feature seams (this is developer/agent infrastructure only)
- Remote feature flag services or external integrations
- A/B testing or traffic splitting
- Seam state persistence in databases
- Automatic seam cleanup or migration tooling beyond the audit script

## Cross-cutting constraints

- The module uses vanilla JS (ESM, no build step)
- The module follows the hex port/adapter pattern consistent with existing modules
- Cross-module access goes through `public-api.mjs` only
- No new framework or runtime dependency
- Existing starter features must continue to work identically
- The typing pattern (JSDoc + `.d.ts` sidecar) must be clean enough to serve as the reference for future modules

## Acceptance boundaries

### Slice 5

- SeamPort interface defines all six operations (isEnabled, register, enable, disable, list, remove)
- Seam states (active, shadow, disabled) are enforced with valid transitions
- Seam metadata includes owner, created, and description fields
- Memory adapter passes the runtime port assertion and all unit tests
- Config adapter reads from a JSON file, falls back gracefully when the file is missing, and passes the port assertion
- Guard helper `whenEnabled` correctly dispatches to the new or old path based on seam state
- Guard helper runs both paths in shadow mode and returns the old path result
- Runtime port assertion throws a clear error naming the missing method for non-conformant adapters
- JSDoc typedefs are present in all source files and reference the `.d.ts` sidecar
- `.d.ts` sidecar defines TypeScript-compatible interfaces without introducing build requirements
- `public-api.mjs` exports only the port, factory, and guards — no adapter internals
- Seam audit script finds registrations, reports state, warns on stale and orphaned seams
- Seam audit script exits non-zero when warnings are present
- Unit tests cover registry logic, guard helpers, both adapters, port assertion, and edge cases
- The module does not break any existing starter features or hex boundaries

```trace-yaml
work_item:
  id: TPL-036
  type: meta
  title: Feature Seams Module
  parent_ref:
  status: done
  module_ref: feature-seams
  spec_refs:
    - docs/prd/feature-seams.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - SeamPort interface provides isEnabled, register, enable, disable, list, and remove operations.
    - Memory and config adapters both pass the runtime port assertion.
    - Guard helpers dispatch correctly based on seam state including shadow mode.
    - JSDoc typedefs and .d.ts sidecar establish the typing pattern for future modules.
    - Public API exposes only the port, factory, and guards.
    - Seam audit script detects stale and orphaned seams.
    - Unit tests prove all adapters, guards, port assertion, and edge cases.
```
