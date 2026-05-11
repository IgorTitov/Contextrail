<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the tree-shaking build optimization that adds an import-graph analyzer and a --treeshake flag to the zero-bundler build script.
@sidecar tree-shaking.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Tree-Shaking Build Optimization

## Requirement intent

The starter template has a zero-bundler build script at `scripts/build-single.mjs` that copies the entire `modules/` directory into `dist/` for deployment. There are 11 hex modules under `modules/`, but a typical app may only use a few. The build output includes unused modules, increasing deployment size unnecessarily.

This epic adds an optional tree-shaking capability to the build pipeline that analyzes the import graph from the app entry point and copies only the modules that are actually referenced.

The **tree-shaking optimization** provides:

- An **import-graph analyzer** (`scripts/import-graph.mjs`) -- a zero-dependency Node.js script that takes an entry file path as input, parses ES module `import` and `export` statements using regex (no AST parser dependency), recursively follows relative and bare-module-specifier imports, and returns the set of all reachable file paths from the entry point. It can determine which `modules/<name>/` directories are actually used. The script exports a programmatic API and has a CLI mode for standalone use.

- A **`--treeshake` flag** in `scripts/build-single.mjs` -- when passed, the build script runs the import-graph analyzer from the app entry point (`apps/starter/app.mjs`), copies only the module directories that appear in the import graph (instead of all `modules/`), and reports which modules were included and which were pruned in the console output. When the flag is not passed, the build behaves identically to today (full copy of all modules).

- A **guide document** (`docs/guides/tree-shaking.md`) -- explains how the import-graph analyzer works, how to use `--treeshake` with the build script, and documents limitations (regex-based, does not handle dynamic imports).

## Classification

This is **technical/architectural** work. The tree-shaking optimization improves build output size and deployment efficiency for developers using the build script. It does not change any user-facing application behavior. USM is intentionally skipped because this is developer tooling that does not introduce new user-facing workflows. The `--treeshake` flag is opt-in and does not alter the default build behavior.

## Deliverables in scope (Slice 12)

### 1. Import-Graph Analyzer (TPL-094)

Script at `scripts/import-graph.mjs`.

**Programmatic API:**

- `analyzeImportGraph(entryPath, options?)` -- accepts an absolute or relative file path as the entry point; returns a Promise resolving to an object with:
  - `files` -- Set of all reachable absolute file paths
  - `modules` -- Set of module directory names found under `modules/` that are referenced in the import graph
  - `unresolvedImports` -- Array of import specifiers that could not be resolved (for diagnostics)

**Options:**

- `baseDir` -- base directory for resolving relative paths (default: `process.cwd()`)
- `modulesDir` -- path to the `modules/` directory (default: `<baseDir>/modules`)

**Import parsing:**

- Parses ES module `import` declarations (static `import ... from '...'` and `import '...'`)
- Parses ES module re-export declarations (`export ... from '...'`)
- Uses regex-based parsing -- no AST parser dependency
- Resolves relative imports (`./ ` and `../`) relative to the importing file
- Resolves bare module specifiers that match `modules/<name>/` paths
- Handles `.mjs` and `.js` file extensions
- Skips Node.js built-in modules (`node:fs`, `fs`, etc.)
- Skips unresolvable external packages (records them in `unresolvedImports`)

**CLI mode:**

- Invocable as `node scripts/import-graph.mjs <entry-file>`
- Prints the list of reachable files and referenced module directories to stdout
- Exits with code 0 on success, non-zero on error

**Constraints:**

- Zero external dependencies -- uses only Node.js built-ins (`fs`, `path`)
- Must be pure and testable -- the core analysis function must work without side effects beyond file reading
- Must handle circular imports without infinite recursion
- Must handle missing files gracefully (record in `unresolvedImports`, do not crash)
- File reading must be the only I/O; all other logic must be deterministic

### 2. Build Script --treeshake Flag (TPL-095)

Enhancement to `scripts/build-single.mjs`.

**Behavior when `--treeshake` is passed:**

- Calls the import-graph analyzer with the app entry point (default: `apps/starter/app.mjs`)
- Determines which `modules/<name>/` directories are referenced in the import graph
- During the build copy step, copies only the referenced module directories into `dist/modules/` instead of copying all of `modules/`
- Prints a summary to the console listing:
  - Which module directories were included (and why -- referenced from the import graph)
  - Which module directories were pruned (not referenced)
  - Total count of included vs. pruned modules

**Behavior when `--treeshake` is NOT passed:**

- Identical to the current behavior -- copies all of `modules/` into `dist/`
- No import-graph analysis is performed

**Constraints:**

- The default (no-flag) build path must not change
- The `--treeshake` flag must be opt-in only
- Console output messages are developer-facing CLI strings (not user-facing UI copy, so i18n is not required)
- Must not introduce new external dependencies
- Must work correctly even if the import-graph analyzer reports unresolved imports (conservative: include a module if resolution is ambiguous)

### 3. Tree-Shaking Guide Documentation (TPL-096)

Guide document at `docs/guides/tree-shaking.md`.

**Content:**

- How the import-graph analyzer works (regex-based static analysis of ES module imports)
- How to use `--treeshake` with the build script (CLI example, expected output)
- How to use the import-graph analyzer standalone (programmatic API, CLI mode)
- Limitations:
  - Regex-based parsing -- does not use a full AST parser
  - Does not detect dynamic `import()` expressions
  - Does not follow CommonJS `require()` calls
  - May not resolve aliased or computed import paths
  - Conservative: if resolution fails, the module is NOT pruned (safe default)
- Troubleshooting: what to do if a needed module is incorrectly pruned

**Constraints:**

- Must be accurate relative to the implemented behavior
- Must follow the existing guide document format and header conventions

## Out of scope

- Full AST parsing (Babel, acorn, or similar) -- regex is sufficient for this use case
- Dynamic `import()` detection -- too complex for regex-based analysis
- CommonJS `require()` support -- the project uses ESM exclusively
- Automatic tree-shaking by default (the flag is opt-in)
- File-level tree-shaking within a module directory (we prune at the module-directory level, not individual files)
- Source map generation or modification
- Minification or other build optimizations
- Module dependency cycle detection as a build error (cycles are handled gracefully but not reported as errors)
- Integration with any external bundler (webpack, rollup, esbuild, etc.)

## Cross-cutting constraints

- Zero external dependencies -- only Node.js built-ins
- The import-graph analyzer must be a pure, testable script
- The build script default path must not change
- Console output is developer-facing CLI, not user-facing UI
- Existing build behavior must continue to work identically when `--treeshake` is not used
- The import-graph analyzer must handle edge cases gracefully (circular imports, missing files, unresolvable specifiers)

## Acceptance boundaries

### Slice 12

- Import-graph analyzer exists at `scripts/import-graph.mjs`
- Analyzer takes an entry file path and returns the set of reachable files and referenced module directories
- Analyzer parses static ES module `import` and `export ... from` declarations using regex
- Analyzer recursively follows relative imports and bare module specifiers
- Analyzer determines which `modules/<name>/` directories are actually used
- Analyzer handles circular imports without infinite recursion
- Analyzer handles missing files by recording them in `unresolvedImports` instead of crashing
- Analyzer skips Node.js built-in modules
- Analyzer exports a programmatic API (`analyzeImportGraph`)
- Analyzer has a CLI mode that prints results to stdout
- Analyzer uses zero external dependencies (Node.js built-ins only)
- Build script accepts a `--treeshake` flag
- When `--treeshake` is passed, only referenced module directories are copied to `dist/modules/`
- When `--treeshake` is passed, the build prints a summary of included and pruned modules
- When `--treeshake` is NOT passed, the build copies all modules (identical to current behavior)
- The build does not crash if unresolved imports exist (conservative inclusion)
- Guide document exists at `docs/guides/tree-shaking.md`
- Guide explains how the analyzer works, how to use the flag, and documents limitations
- No external dependencies are introduced anywhere in the slice

```trace-yaml
work_item:
  id: TPL-093
  type: meta
  title: Tree-Shaking Build Optimization
  parent_ref:
  status: done
  module_ref: build
  spec_refs:
    - docs/prd/tree-shaking.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - Import-graph analyzer parses ES module imports using regex and returns reachable files and referenced module directories.
    - Build script --treeshake flag copies only referenced modules into dist/ and reports included/pruned modules.
    - Guide doc explains usage, programmatic API, CLI mode, and limitations.
    - Zero external dependencies throughout the slice.
    - Default build path is unchanged when --treeshake is not used.
```
