<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Top-level index for the templates/ directory — maps each scaffold subdirectory to its target platform and key files.
@sidecar README.md.header.md
@layer templates | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!--
SpecRefs: TPL-033
-->

# Platform scaffold templates

Each subdirectory contains the minimal files needed to wrap the starter app
for a specific deployment target. These are starting points, not frameworks.

| Directory     | Target platform          | Key files                              |
|---------------|--------------------------|----------------------------------------|
| `electron/`   | Desktop (Electron)       | main.mjs, preload.mjs, package.json    |
| `extension/`  | Browser extension (MV3)  | manifest.json, background.mjs, popup.html |
| `capacitor/`  | Mobile (Capacitor)       | capacitor.config.json                  |

## Usage pattern

1. Build the starter app with the appropriate mode:
   `pnpm build:electron`, `pnpm build:local`, or `pnpm build:hosted`
2. Copy the scaffold into your project.
3. Follow the scaffold's README for platform-specific setup.

The starter app detects its runtime environment automatically and selects
the right storage adapter. No code changes needed for basic platform switching.

See [docs/guides/platforms.md](../docs/guides/platforms.md) for the full guide.
