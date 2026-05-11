<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for migrating Contextrail modules from .mjs to TypeScript.
@sidecar typescript-migration.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# TypeScript Migration Guide

This guide covers migrating Contextrail hex modules from `.mjs` to TypeScript. The architecture is designed for this — domain and port layers are already pure JS with no framework dependencies, and `.d.ts` type stubs exist for most modules.

## Strategy

Migrate one module at a time. The hex boundary (`public-api.mjs`) isolates each module, so you can have TypeScript modules coexisting with JavaScript modules indefinitely.

**Recommended order:**

1. Leaf modules first (no dependencies) — `event-bus`, `form-validation`, `i18n`
2. Then modules with few deps — `auth`, `cache`, `state`
3. Infrastructure modules last — `retrieval`, `cqrs`, `realtime`

## Per-module steps

### 1. Rename files

```bash
# In modules/your-module/
mv public-api.mjs public-api.ts
mv domain/your-logic.mjs domain/your-logic.ts
mv ports/your-port.mjs ports/your-port.ts
mv adapters/your-adapter.mjs adapters/your-adapter.ts
```

### 2. Update cross-module imports

Every other module that imports from your module references `public-api.mjs`. After renaming, update these imports:

```bash
# Find all consumers
grep -r "modules/your-module/public-api" modules/ apps/ --include="*.mjs" --include="*.ts"
```

If using TypeScript path aliases, configure them in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "modules/*": ["./modules/*"]
    }
  }
}
```

### 3. Add types to domain layer

The domain layer is pure logic — start here. Convert JSDoc `@param` / `@returns` annotations to TypeScript type annotations.

```typescript
// Before (domain/validator.mjs)
/** @param {string} email @returns {boolean} */
export function isValidEmail(email) {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}

// After (domain/validator.ts)
export function isValidEmail(email: string): boolean {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}
```

### 4. Type the port interfaces

Ports are contracts — they benefit most from TypeScript's type system.

```typescript
// Before (ports/storage-port.mjs)
/**
 * @typedef {Object} StoragePort
 * @property {(key: string) => Promise<string|null>} get
 * @property {(key: string, value: string) => Promise<void>} set
 */

// After (ports/storage-port.ts)
export interface StoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
```

### 5. Type the adapters

Adapters implement port interfaces. TypeScript enforces the contract at compile time.

```typescript
// adapters/memory-storage-adapter.ts
import type { StoragePort } from '../ports/storage-port.ts';

export function createMemoryStorageAdapter(): StoragePort {
  const store = new Map<string, string>();
  return {
    async get(key) { return store.get(key) ?? null; },
    async set(key, value) { store.set(key, value); },
  };
}
```

### 6. Remove the `.d.ts` stubs

Once the module is fully TypeScript, the `.d.ts` type stub files are redundant — TypeScript generates declarations from source. Delete them:

```bash
rm modules/your-module/public-api.d.ts
rm modules/your-module/domain/*.d.ts
rm modules/your-module/ports/*.d.ts
rm modules/your-module/adapters/*.d.ts
```

### 7. Update the manifest

In `modules/your-module/manifest.json`, update file references and structure:

```json
{
  "structure": {
    "entryPoint": "public-api.ts",
    "layers": ["domain", "ports", "adapters"]
  }
}
```

### 8. Update the header

```
@version 0.6.0 | 2026-04-11
@sidecar public-api.ts.header.md
```

Rename the sidecar file to match: `public-api.mjs.header.md` → `public-api.ts.header.md`.

## Architecture check compatibility

The `architecture-check.mjs` deep-import regex already supports `.ts` / `.tsx` extensions:

```
public-api\.[cm]?[jt]sx?
```

No changes needed to quality gates.

## What NOT to do

- **Don't migrate all modules at once.** One module per commit keeps diffs reviewable.
- **Don't add a build step for modules.** TypeScript modules should be consumed directly by the app layer's bundler (Vite, esbuild, tsc). Modules don't need their own `tsconfig.json`.
- **Don't change the hex architecture.** The layer boundaries (domain → ports ← adapters) stay the same. TypeScript adds type safety, not new patterns.
- **Don't migrate the `scripts/` directory.** Tooling scripts are Node-only and don't benefit from migration. Keep them as `.mjs`.
