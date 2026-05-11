---
fileId: contextrail-template:scripts:lib:slice-id-config
module: scripts/lib
stability: stable
steward: shared
api: readSliceIdConfig, validateSliceIdConfig, writeDefaultSliceIdConfig, ConfigMissingError, ConfigSchemaError
summary: Read and validate .coa/slice-id-config.json; provide config-based prefix detection and idempotent default config scaffolding (TPL-300 / ADR-0032).
owns: ConfigMissingError, ConfigSchemaError, readSliceIdConfig, validateSliceIdConfig, writeDefaultSliceIdConfig
boundaries: Pure I/O around a single JSON file. No git, no network, no process.exit. Callers decide what to do with errors.
invariants: ConfigMissingError.code === 'CONFIG_MISSING'. ConfigSchemaError.code === 'CONFIG_SCHEMA_ERROR'. readSliceIdConfig is pure-parse; never modifies the file. writeDefaultSliceIdConfig is idempotent (no-op if file exists).
risks: A lenient PREFIX_RE would reintroduce the AIC-DEV hyphen collision class (see ADR-0032). Keep PREFIX_RE as /^[A-Z][A-Z0-9]+$/.
securityPrivacy: No external access.
notesForLLM: Do not allow hyphens in the prefix pattern — isValidSliceId treats the first hyphen as the separator between prefix and number, so AIC-DEV-100 would be mis-parsed as prefix=AIC, number=DEV-100.
tests: tests/integration/slice-id-config.test.mjs
linkedDocs:
  - docs/adr/0032-slice-id-config.md
  - docs/guides/slice-id-config.md
  - scripts/coa-worktree.mjs
  - scripts/bootstrap.mjs
related:
  - .coa/slice-id-config.json
---

# slice-id-config.mjs
