<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for module detachment tooling and the JS+JSDoc ADR that documents the template's language-strategy decision.
@sidecar module-detachment.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Module Detachment + Language Strategy ADR

## Requirement intent

As the template grows to 12+ hex modules, consumers need a safe, documented way to remove modules they do not need. Currently, removing a module requires manual hunting through imports, tests, backlog references, and the import-graph awareness. A module detachment tool should automate the safe parts and warn about the unsafe parts.

Separately, the template's choice of JS + JSDoc + `.d.ts` sidecars over TypeScript is a deliberate architectural decision that deserves a formal ADR so future contributors understand the rationale and have a clear migration path if they choose differently.

This PRD covers two concerns delivered together in Slice 18:

### Module Detachment Tooling (TPL-129)

The detachment tooling provides:

- A **module dependency manifest** (`modules/<name>/manifest.json`) for each hex module declaring its dependencies on other modules, external packages, and Node.js built-in APIs. This makes the dependency graph explicit and machine-readable.

- A **detach-module CLI script** (`scripts/detach-module.mjs`) that reads the manifest to understand the dependency graph, warns about cascade breaks before proceeding, removes the module directory, associated test files, and backlog references, and updates the import-graph awareness used by the tree-shaking build.

- A **detachment guide** (`docs/guides/module-detachment.md`) documenting the process, manifest format, common patterns, and recovery steps.

- **Tests** for the detach script verifying manifest parsing, dependency detection, warning behavior, and file removal.

### TS vs JS Language Strategy ADR (TPL-134)

A formal ADR at `docs/adr/0005-js-jsdoc-over-typescript.md` documenting:

- The decision: JS + JSDoc + `.d.ts` sidecars over TypeScript
- Arguments in favor (zero build step, native ESM, runtime-inspectable source, LLM-friendlier, no transpilation drift)
- Arguments against (no compile-time type checking, verbosity of JSDoc for complex generics, tooling ecosystem favoring TS)
- Current state rationale (the template is a delivery-pattern reference, not a production app framework)
- Migration path for consumers who want TypeScript

## Classification

This is **technical/architectural** work. The detachment tooling improves developer workflow for template consumers. The ADR improves decision traceability. USM is intentionally skipped because neither introduces user-facing workflows.

## Deliverables in scope (Slice 18)

### Module Detachment

#### 1. Module Dependency Manifest (TPL-130)

Each hex module gets a `manifest.json` at its root declaring:

```json
{
  "name": "<module-name>",
  "version": "0.1.0",
  "dependencies": {
    "modules": [],
    "external": [],
    "builtins": []
  },
  "exports": ["public-api.mjs"],
  "testFiles": ["tests/unit/<module>.test.mjs", "tests/contract/<module>-hex-contract.test.mjs"]
}
```

Fields:

- `name` -- module name matching the directory name
- `version` -- module version (tracks independently of the template version)
- `dependencies.modules` -- array of other module names this module imports from (should be empty for standalone modules)
- `dependencies.external` -- array of npm package names required (should be empty for zero-dep modules)
- `dependencies.builtins` -- array of Node.js built-in modules used (if any)
- `exports` -- array of files that constitute the public API surface
- `testFiles` -- array of associated test file paths relative to repo root

Constraints: JSON format (no comments). Must be kept in sync with actual module dependencies. The manifest is the source of truth for the detach script. All current modules should have `dependencies.modules: []` since they are all standalone.

#### 2. Detach-Module CLI Script (TPL-131)

Script at `scripts/detach-module.mjs` providing:

- `node scripts/detach-module.mjs <module-name>` -- detaches the named module
- `node scripts/detach-module.mjs <module-name> --dry-run` -- shows what would be removed without removing anything
- `node scripts/detach-module.mjs --list` -- lists all modules with their dependency status

Behavior:

1. Read all `modules/*/manifest.json` files to build the dependency graph
2. Check if any other module depends on the target module
3. If dependents exist, print a warning listing them and exit with a non-zero code (unless `--force` is passed)
4. Remove the module directory (`modules/<name>/`)
5. Remove associated test files listed in the manifest
6. Remove backlog references (scan `docs/backlog/` for the module_ref)
7. Print a summary of what was removed and any manual follow-up needed

Constraints: Node.js built-ins only (no external deps). Must support `--dry-run` for safe preview. Must not silently remove modules that have dependents. Must handle missing manifests gracefully (warn but continue). Output is developer-facing CLI, not user-facing UI.

#### 3. Detachment Guide (TPL-132)

Documentation at `docs/guides/module-detachment.md` covering:

- What module detachment is and when to use it
- The manifest.json format and how to maintain it
- Step-by-step detachment using the CLI script
- Manual steps that may be needed after automated detachment (e.g., removing UI references, updating app configuration)
- Recovery steps if detachment breaks something
- Common patterns (detaching leaf modules vs. modules with dependents)

Constraints: Markdown format. Must reference the actual script and manifest paths. Must be accurate for the current module inventory.

#### 4. Detach Script Tests (TPL-133)

Tests for the detach script covering:

- Manifest parsing and validation
- Dependency graph construction
- Dependent detection and warning behavior
- Dry-run mode (no file changes)
- File removal in normal mode
- Graceful handling of missing manifests
- Force mode with dependents

Constraints: Tests must be runnable without modifying the actual module directories (use temp directories or mocks).

### Language Strategy ADR

#### 5. TS vs JS ADR (TPL-134)

ADR at `docs/adr/0005-js-jsdoc-over-typescript.md` following the ADR format established in the repository.

Sections:

- **Status:** Accepted
- **Context:** The template needs a language strategy for hex modules, scripts, and configuration
- **Decision:** Use JavaScript (ESM) with JSDoc type annotations and `.d.ts` sidecar type definitions
- **Arguments for JS + JSDoc:** zero build step for any module, native ESM without transpilation, source code is the runtime code (no source map indirection), JSDoc is human-readable in the source, `.d.ts` sidecars provide TypeScript compatibility without requiring TS tooling, LLM agents can read and modify source directly
- **Arguments for TypeScript:** compile-time type checking catches errors earlier, richer type system (generics, mapped types, conditional types), larger ecosystem of typed libraries and tooling, IDE experience is more polished for TS-first projects
- **Current state rationale:** The template is a delivery-pattern reference demonstrating hex architecture, TDD, and trunk-based delivery. The zero-build-step constraint is a deliberate simplification. The `.d.ts` sidecar pattern gives TypeScript consumers full type safety without imposing a build step on the template itself.
- **Migration path:** Consumers who want TypeScript can rename `.mjs` to `.ts`, merge JSDoc annotations into TS syntax, and add a `tsconfig.json`. The hex architecture and port/adapter boundaries are language-agnostic. A migration guide should reference this ADR.
- **Consequences:** All new modules continue using JS + JSDoc + `.d.ts`. Type-heavy utility code may be more verbose than equivalent TS. Contributors must maintain both JSDoc annotations and `.d.ts` sidecars.

Constraints: ADR format must follow the existing pattern in `docs/adr/`. The ADR is a documentation artifact, not a code change. Must present both sides fairly.

## Out of scope

- Automatic migration from JS to TS (that would be a separate tool/slice)
- Persistent module registry or package manager integration
- Cross-module dependency injection framework
- Module versioning or semver enforcement
- Auto-updating manifest.json from source analysis (could be a future enhancement)
- GUI or web interface for module management

## Cross-cutting constraints

- All scripts use vanilla JS (ESM, no build step) and Node.js built-ins only
- The detach script must work on all supported platforms (Windows, macOS, Linux)
- Documentation follows existing markdown patterns and header discipline
- The ADR follows the repository's established ADR format
- No new framework or runtime dependency

## Acceptance boundaries

### Slice 18

- Every hex module has a manifest.json declaring its dependencies, exports, and test files
- The detach-module script reads manifests and builds a dependency graph
- The script warns about cascade breaks and exits non-zero when dependents exist
- The script supports --dry-run, --force, and --list modes
- The script removes module directory, test files, and backlog references
- The detachment guide documents the process, format, and recovery steps
- Tests cover manifest parsing, dependency detection, dry-run, and removal
- The TS-vs-JS ADR documents both sides and provides a migration path
- The ADR follows the established ADR format

```trace-yaml
work_item:
  id: TPL-129
  type: meta
  title: Module Detachment Tooling
  parent_ref:
  status: done
  module_ref: core
  spec_refs:
    - docs/prd/module-detachment.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - Every hex module has a manifest.json declaring dependencies, exports, and test files.
    - The detach-module CLI safely removes modules with dependency-aware warnings.
    - The detachment guide documents the process, manifest format, and recovery steps.
    - Tests verify manifest parsing, dependency detection, dry-run, and removal behavior.
```

<!-- TPL-134 work item lives in docs/backlog/module-detachment.md -->
