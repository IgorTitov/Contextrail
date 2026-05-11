<!-- @HEADER
@version 0.7.101 | 2026-05-05
@purpose Explain the shared script library and its modules.
@sidecar README.md.header.md
@layer tooling | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Script library

Shared modules for the template's deterministic repo scripts.

## Modules

- [errors.mjs](errors.mjs) — typed error hierarchy (`ScriptError`, `ValidationError`, `FileNotFoundError`, `ParseError`, `SchemaError`) for structured script failures.
- [fs-helpers.mjs](fs-helpers.mjs) — pure filesystem and path utilities: `ROOT`, `IGNORE`, `toPosix`, `walk`, `fileExists`, `readText`, `writeText`, `ensureWriteIfChanged`.
- [cli-helpers.mjs](cli-helpers.mjs) — CLI argument parsing: `parseArgs`.
- [output.mjs](output.mjs) — structured output formatting: `result`, `now`, `todayIsoDateUTC`.
- [trace-helpers.mjs](trace-helpers.mjs) — work-item and BDD trace parsing: `parseBddRef`, `collectWorkItems`.
- [repo-meta.mjs](repo-meta.mjs) — repository identity and version: `repoFileIdPrefix`, `allowedFileIdPrefixes`, `repoVersion`, `headerStampVersion`, `REPO_FILEID_PREFIX`.
- [header.mjs](header.mjs) — header v2 engine: schema constants, comment-style decisions, file discovery, regex, parsing, rendering, injection, and validation.
- [module-work-surface.mjs](module-work-surface.mjs) — module work-surface computation: `approximateTokenCount`, `pickRepresentativeImpl`, `pickRepresentativeTest`, `measureWorkSurface`, `computeDistribution`, `discoverModuleNames`.

All seven original modules are also re-exported from `scripts/checks/_shared.mjs` for backward compatibility.

## Usage

```js
// Direct import from focused modules:
import { ValidationError, FileNotFoundError } from '../lib/errors.mjs';
import { fileExists, readText } from '../lib/fs-helpers.mjs';
import { parseArgs } from '../lib/cli-helpers.mjs';
import { result } from '../lib/output.mjs';
import { parseBddRef, collectWorkItems } from '../lib/trace-helpers.mjs';
import { repoFileIdPrefix, repoVersion } from '../lib/repo-meta.mjs';
import { commentStyle, validateHeader, injectInlineHeader } from '../lib/header.mjs';

// Or via the facade (all existing scripts do this):
import { parseArgs, result, fileExists } from './_shared.mjs';
```

The `result()` function serializes both plain strings and `ScriptError` instances (via `toJSON()`) in `--json` output.
