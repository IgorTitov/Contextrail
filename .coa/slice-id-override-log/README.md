<!-- @HEADER
@version 0.8.12 | 2026-05-11
@purpose Archive of consumed slice-id override files — each file records a legitimate slice-ID reuse event approved at commit time.
@sidecar README.md.header.md
@layer tooling | @hex _none_ | @ctx _none_
@public false
@edit append-only -->

# slice-id-override-log

Archive of consumed slice-id override files. Each file records a legitimate slice-ID reuse event.

Files are named `<timestamp-ms>-<slice-id>.json` and contain the original override data plus a `consumed_at` field stamped at validation time.

These files ARE tracked in git — they are the audit trail for every approved reuse. The ephemeral input file (`.coa/slice-id-override.json`) is gitignored.

See `docs/guides/slice-id-override-emergency.md` for when and how to create an override.
