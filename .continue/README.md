<!-- @HEADER
@version 0.7.30 | 2026-04-28
@purpose Folder guide for the Continue (VSCode/JetBrains) configuration seed.
@sidecar README.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# .continue

This folder seeds Continue (the VSCode/JetBrains AI coding-assistant extension) with Contextrail-aware defaults.

## Files

- `config.template.json` — committed copy-and-adapt seed. Points at a local LM Studio endpoint and references `LOCAL.md` as the slim Contextrail contract.
- `config.json` — your local copy. **Gitignored** — do not commit. Contains your real model picks, API endpoints, and any personal preferences.

## Usage

1. Install the [Continue extension](https://www.continue.dev/) in VSCode or a JetBrains IDE.
2. Copy `config.template.json` to `config.json`.
3. Adjust `apiBase`, `model`, and any rules to fit your local setup.
4. Reload the IDE so Continue picks up the new config.

The full setup recipe lives in [docs/guides/local-frameworks.md](../docs/guides/local-frameworks.md). The slim Contextrail contract Continue should read each session is [LOCAL.md](../LOCAL.md).

## Why a template plus a gitignored copy?

Contextrail keeps the seed under version control so contributors share the same starting defaults. Each contributor's actual config can drift (different model, different endpoint, personal rules) without churning the repo. Mirrors the Aider pattern at `.aider.conf.yml.template` + gitignored `.aider.conf.yml`.
