<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain how the import-graph analyzer and --treeshake build flag work, including usage examples, programmatic API, and known limitations.
@sidecar tree-shaking.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-096
-->

# Tree-shaking guide

The build system includes an optional tree-shaking mode that copies only the `modules/` directories your app actually uses, reducing the deployment footprint.

## How it works

1. The **import-graph analyzer** (`scripts/import-graph.mjs`) reads the app entry point and follows all ES module `import` / `export` / `import()` statements using regex-based static analysis.
2. It determines which files are reachable and which `modules/<name>/` directories are referenced.
3. The **`--treeshake` build flag** uses this analysis to copy only the referenced module directories into `dist/modules/` instead of copying all modules.

## Using `--treeshake` with the build script

```bash
# Standard build — copies ALL modules to dist/
node scripts/build-single.mjs --mode hosted --clean

# Tree-shaken build — copies only referenced modules
node scripts/build-single.mjs --mode hosted --clean --treeshake
```

Example output with `--treeshake`:

```
Build complete: 10 entries copied to dist (mode: hosted)
  Included modules (2): notifications, user-preferences
  Pruned modules (9): ai-chat, api-client, auth, event-bus, example-greeter, feature-seams, local-llm, retrieval, state
```

The default build path (without `--treeshake`) is completely unchanged — all modules are copied as before.

## Import-graph analyzer

### CLI usage

```bash
# Analyze the import graph from an entry file
node scripts/import-graph.mjs apps/starter/app.mjs

# Specify a custom modules directory
node scripts/import-graph.mjs apps/starter/app.mjs --modules-dir ./modules
```

Output includes:
- Total reachable files count
- Referenced module directories (only modules the app imports)
- Unresolved imports (specifiers that could not be resolved to files)

### Programmatic API

```js
import { analyzeImportGraph, parseImports } from './scripts/import-graph.mjs';

// Full graph analysis
const { files, modules, unresolvedImports } = await analyzeImportGraph(
  '/path/to/entry.mjs',
  { modulesDir: '/path/to/modules' },
);

// files: Set<string>             — all reachable absolute file paths
// modules: Set<string>           — referenced module directory names
// unresolvedImports: Array<{file, specifier}> — imports that couldn't resolve

// Low-level: extract import specifiers from source code
const specifiers = parseImports(sourceCode);
// Returns: string[] — e.g. ['./utils.mjs', '../config.mjs']
```

**`analyzeImportGraph(entryPath, options?)`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `entryPath` | `string` | Absolute path to the entry file |
| `options.modulesDir` | `string?` | Absolute path to the modules directory |

Returns `Promise<{ files: Set<string>, modules: Set<string>, unresolvedImports: Array }>`.

**`parseImports(source)`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `string` | ES module source code |

Returns `string[]` — the ordered list of unique import specifiers found.

## What the analyzer detects

- `import { x } from './module.mjs'` — named imports
- `import x from './module.mjs'` — default imports
- `import * as x from './module.mjs'` — namespace imports
- `import './module.mjs'` — side-effect imports
- `export { x } from './module.mjs'` — re-exports
- `export * from './module.mjs'` — export-all
- `await import('./module.mjs')` — dynamic imports with string literals

## Limitations

The analyzer is **regex-based** (not AST-based) by design, keeping it zero-dependency. This means:

- **No dynamic import() with variables** — `import(variableName)` or `` import(`./path/${name}.mjs`) `` are not detected. Only literal string specifiers are parsed.
- **No CommonJS require()** — the analyzer only handles ES module syntax.
- **No aliased or mapped paths** — import maps, TypeScript path aliases, or bundler-specific aliases are not resolved.
- **No computed specifiers** — `import(condition ? './a.mjs' : './b.mjs')` is not detected.
- **Single-line comment filtering only** — block comments (`/* */`) containing imports may still be parsed.

### Conservative default

When the analyzer encounters an unresolvable import, it **does not crash** and **does not prune** the importing module. Unresolved imports are recorded for diagnostic output but do not affect which modules are included.

If a module is referenced at all in the graph, the entire `modules/<name>/` directory is copied — there is no file-level pruning within a module.

## Troubleshooting

**A module is incorrectly pruned:**

If your app uses a module that `--treeshake` removes, the import path may use a pattern the regex parser doesn't detect (e.g., dynamic variable paths). Fix by adding a static import of the module's `public-api.mjs` anywhere in the import chain, or skip `--treeshake` for that build.

**Unresolved imports in output:**

Unresolved imports are usually harmless — they indicate specifiers the analyzer couldn't map to existing files. Common causes:
- Files that don't exist yet (e.g., conditional PWA files)
- Non-relative bare specifiers not in `modules/`

Check the unresolved imports list in the CLI output and verify the files should exist.
