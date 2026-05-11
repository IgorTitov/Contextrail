<!-- @HEADER
@version 0.8.0 | 2026-05-07
@purpose End-to-end setup guide for driving a Contextrail repo with local-tier coding harnesses (Aider, Continue, Cline) pointed at a local LM Studio / Ollama endpoint running a 7B-class open-source model.
@sidecar local-frameworks.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Local frameworks — Aider, Continue, Cline + LM Studio

Contextrail is designed to support **mixed-tier teams** of agents (see `agentProfiles` in `docs/agent-contract/compatibility-contract.json`). Frontier-class hosted models (Claude, GPT-class, Gemini) own architecture and multi-module slices. **Local-tier** models — 7B/70B open-source code models running on your own machine — own bounded slices inside one module, or run as deterministic helpers for header sync, commit-message templating, and similar narrow tasks.

This guide walks you through running a Contextrail repo with a local-tier setup end-to-end: pick a model, install an inference server, install a harness, configure it, and verify the loop with a smoke task. Three harnesses get first-class support here: **Aider**, **Continue**, and **Cline**.

If you are already running Claude Code or Codex CLI, you do not need any of this — the frontier-tier adapters in `.claude/` and `AGENTS.md` cover you. This guide is for contributors who want to run the same repo against a local model, either for cost / privacy reasons or as a second deterministic helper alongside a frontier-tier session.

## Overview — what local-tier means

Contextrail's agent contract reserves a **`small`** capability tier for agents with as little as 16K context tokens. The slim adapter `LOCAL.md` (~1.4K tokens, hard cap 5K) is what your local-tier agent reads each session — it is the working contract that omits Claude-class concepts (subagents, hooks, MCP, slash commands) and keeps only what a 7B-class model can actually act on:

- coordination via `claim-check`
- commit ceremony via `coa-merge`
- header discipline (ADR-0009)
- module-fit constraint (ADR-0013)
- the test gate
- definition of done

For narrower deterministic-helper tasks (header sync, README touch-up, commit-message templating) Contextrail provides an even slimmer **`MICRO.md`** (~0.5K tokens, hard cap 2K) which explicitly disclaims slice ownership and defers behavior decisions to the operator.

The two slim adapters are generated from the canonical contract at `docs/agent-contract/compatibility-contract.json`. Do not edit them by hand.

## Hardware envelope

A 7B-class model in 4-bit quantization runs comfortably on a modern laptop. Approximate requirements:

| Component | Minimum | Comfortable |
| --- | --- | --- |
| RAM | 16 GB | 32 GB |
| VRAM | none (CPU-only works, slower) | 8 GB |
| Disk | 6 GB free for one model | 20 GB for a few model picks |
| OS | Windows 10+, macOS 12+, Linux | any current |

CPU-only inference is functionally identical to GPU — just slower (2-5 tokens/sec vs 30-80 tokens/sec). For interactive coding work, GPU acceleration matters; for overnight batch helper tasks, CPU is fine.

A 70B model in 4-bit quantization needs ~40 GB of RAM/VRAM combined and is comfortable territory only on a dedicated workstation. Most contributors start with 7B and upgrade only if quality demands it.

## Common installation issues (Windows)

First-time operators on Windows commonly hit a cluster of setup hurdles before the local-tier stack is functional. Each issue below is short — one diagnostic command and one fix.

### Python 3.13 not yet supported by Aider

`pip install aider-chat` resolves to ancient `aider-chat 0.16.0` because newer versions lack Python 3.13 wheels. Fix: install Python 3.12 alongside 3.13 via `winget install Python.Python.3.12`, then use `py -3.12 -m pip install aider-chat`. Verify with `aider --version` (should report ≥0.86).

### Aider's Scripts directory not on PATH after pip install

pip warns about the Scripts directory not being on PATH; `aider` command is not found in new shells. Fix: PowerShell profile injection — append the following to `$PROFILE` (replace `Igor` with your Windows username):

```powershell
$env:PATH = "C:\Users\Igor\AppData\Local\Programs\Python\Python312\Scripts;" + $env:PATH
```

New PowerShell sessions will find `aider` without further action.

### User PATH exceeds 2047-char legacy limit

Symptom: even after `[Environment]::SetEnvironmentVariable(...)` succeeds, new processes do not see the new PATH entry because Windows truncates the combined User+System PATH at 2047 characters. Diagnose with:

```powershell
[Environment]::GetEnvironmentVariable("PATH", "User") -split ';' | Where-Object { $_ -like "*Python*" }
```

Duplicates of system-PATH content in User PATH indicate accumulation from past installers. Pragmatic fix: the PowerShell profile injection above sidesteps the limit entirely. Cleanup of bloated User PATH is a separate housekeeping task.

### LM Studio Context Length default (262144 / 256K) blows VRAM

The default Context Length of 256K produces Estimated Memory of 40+ GB even for a 27B-class model because KV-cache scales with context length. Fix: reduce Context Length to **32768 (32K)** before clicking Load Model — Estimated Memory drops to ~22 GB and fits 24 GB VRAM. 32K is sufficient for a slice-aware brief (≤16K tokens) plus the model's response budget.

### LM Studio API Identifier — keep it short

Long internal model IDs like `Smoffyy/Qwen3.6-27B-Instruct-Pure` are awkward to pass via `aider --model openai/...`. In LM Studio's Load Model dialog, set the **API Identifier** field to a short alias (e.g. `qwen3.6-27b-instruct`). This alias appears in `/v1/models` and is what you pass as `--model openai/<id>`.

### PowerShell Ctrl+V inserts `м` instead of pasting

Symptom of a layout / PSReadLine keybinding mismatch. Workaround: right-click in the PowerShell window pastes clipboard regardless of keybinding; `Shift+Insert` also works reliably. Persistent fix (PSReadLine ≥2.2 only): `Set-PSReadLineKeyHandler -Chord Ctrl+v -Function Paste`. Windows PowerShell 5.1 ships PSReadLine 2.0, which does not support `-Chord` — use the right-click workaround instead.

## Stack safety classification

Below are the four stacks empirically validated through D6 (see `docs/analysis/session-summaries/2026-05-06_D6-CrossVariant-synthesis.md` for full methodology).

| # | Stack | Mandatory discipline | Use case | Validation |
| --- | --- | --- | --- | --- |
| 1 | **Qwen3.6-27B-Instruct** (dense, Q4_K_M) + Aider + LM Studio, 32K ctx | Operator-diff-review-recommended before commit | Sidecar / metadata-rich documentation tasks (richest sourced fields, no fabrication) | `2026-05-06_D6-VariantA-T1_attempt1.md`, `2026-05-06_D6-VariantA-T1_attempt2.md`, `2026-05-06_D6-VariantA-T2_attempt2.md` |
| 2 | **Qwen3.6-35B-A3B-Instruct** (MoE, Q4_K_M) + Aider + LM Studio, 32K ctx | F13 prompt prefix MANDATORY for any code-edit user message (verbatim text in [byollm-feature-dispatch.md](byollm-feature-dispatch.md)); without prefix → silent test-coverage loss (F8) | Code-edit slices when richer reasoning capacity is preferred over Devstral's token efficiency | `2026-05-06_D6-VariantB-T1_attempt1.md`, `2026-05-06_D6-VariantB-T2_attempt1-default-prompt.md` (F8 reproduced), `2026-05-06_D6-VariantB-T2_attempt2-augmented.md` (F13 deflation PASS) |
| 3 | **Devstral Small 2 24B** (Mistral SWE-tune dense, Q4_K_M) + Aider + LM Studio, 32K ctx | None for code-edit (F8-immune, structural-anchor edit style); operator review of sidecar `tests:` / `module:` fields recommended (F9 metadata hallucination) | Default code-edit slice work — lowest VRAM (17.93 GB), ~10× more token-efficient than Qwen at the wire | `2026-05-06_D6-Variant2-T1_attempt1.md`, `2026-05-06_D6-Variant2-T2_attempt1.md` |
| 4 | **Qwen3-Coder-30B-A3B-Instruct** (MoE, Q4_K_M) + Aider + LM Studio, 32K ctx | `--edit-format whole` MANDATORY (mitigates F11 path-mirroring on coder-tune); fence-strip post-processing MANDATORY for code-file edits (F15 trailing-fence corrupts `.mjs`/`.js`/`.ts`) — Cockpit handles both automatically; manual workflow in [byollm-feature-dispatch.md](byollm-feature-dispatch.md) | Code-edit slices with coder-tune emphasis | `2026-05-06_D6-Variant3-T1_attempt3-whole-format.md`, `2026-05-06_D6-Variant3-T2_attempt-whole-format.md` (F15 reproduced + manual strip → 11/11 PASS) |

**Known-broken**: Magistral Small 2509 + Aider on Windows exhibits persistent path-mirroring (F11) across both `diff` and `whole` edit formats; not recommendable until upstream Aider path-normalization fix or wrapper. See synthesis §addendum.

> **Operational discipline per stack** — applying the F13 prompt prefix for Variant B, the `--edit-format whole` flag plus fence-strip post-processing for Variant 3, and stack-aware dispatch routing — lives in **Cockpit** when Cockpit is installed, automatic via UI. For non-Cockpit users (manual workflow), see [docs/guides/byollm-feature-dispatch.md](byollm-feature-dispatch.md) which documents the manual disciplines verbatim.

### Choosing among recommendable stacks

For Continue's wider model menu and per-task model swapping, see Continue's own model registry at <https://www.continue.dev/models>. For Aider's model-compatibility matrix, see <https://aider.chat/docs/llms.html>.

If you find a model that consistently nails Contextrail's task class T1 (see [Verifying the setup](#verifying-the-setup) below), please note it in `docs/analysis/field-findings-log.md` so the recommendation can travel.

## Variant: Aider + LM Studio + Qwen

Aider is a terminal-driven coding agent. Mature, stable, well-suited for OpenAI-compatible local endpoints.

### Setup

1. **Install LM Studio** from <https://lmstudio.ai>. Launch it, search the model browser for `qwen2.5-coder-7b-instruct`, download the Q4_K_M GGUF.
2. **Start the local server.** In LM Studio, switch to the "Local Server" tab, load the downloaded model, click "Start Server". Default endpoint is `http://localhost:1234/v1`.
3. **Install Aider.**

   ```bash
   pip install aider-chat
   ```

4. **Seed the config.** Copy `.aider.conf.yml.template` (committed) to `.aider.conf.yml` (gitignored, operator-local):

   ```bash
   cp .aider.conf.yml.template .aider.conf.yml
   ```

   Edit `.aider.conf.yml` if your endpoint or model name differs. The template ships with sensible defaults: LM Studio's port, Qwen-2.5-Coder-7B as model and weak-model, `LOCAL.md` and `MICRO.md` always loaded into context, `auto-commits: false` so it does not race with `coa-merge`.

5. **Run Aider** from the repo root:

   ```bash
   aider
   ```

   The `read:` block in the config pulls `LOCAL.md` and `MICRO.md` into context automatically. Add specific files to the chat with `/add modules/<your-module>/...` once Aider is running.

### Working loop

Inside Aider, frame each request as a bounded slice. Example:

```
> Add a unit test in modules/example-greeter/ for the case
> "greet returns the default greeting when no name is provided".
> File a claim before editing, commit via coa-merge.
```

Aider produces a unified diff, asks for confirmation, applies it, and stops. You then run the commit ceremony from a separate terminal:

```bash
node scripts/coa-merge.mjs --message="test(greeter): cover default-greeting case (TPL-XXX)"
```

`coa-merge` handles the rest — version bump, CHANGELOG release, claim auto-complete, snapshot to `.backups/`.

## Variant: Continue + LM Studio + Qwen

Continue is an in-IDE assistant for VSCode and JetBrains. Useful when you want diffs visible alongside the file rather than in a terminal.

### Setup

1. **Install LM Studio and start the model** as in the Aider variant above.
2. **Install Continue.** In VSCode, search the marketplace for "Continue" and install. In JetBrains IDEs, install from the plugin marketplace.
3. **Seed the config.** Copy `.continue/config.template.json` (committed) to `.continue/config.json` (gitignored):

   ```bash
   cp .continue/config.template.json .continue/config.json
   ```

   The template ships with: LM Studio endpoint, Qwen-2.5-Coder-7B as the model, a `systemMessage` pointing at `LOCAL.md`, and a `rules[]` array reminding the model about Contextrail's coordination, commit ceremony, header discipline, and slice-scoping rules.

4. **Reload the IDE.** Continue picks up the new config on reload. Open the Continue side panel and pick "Qwen 2.5 Coder 7B (LM Studio)" from the model dropdown.

### Working loop

Continue surfaces three primary actions: **inline edit** (Cmd/Ctrl+I on selected code), **chat** (the side panel), and **autocomplete**. For Contextrail work, prefer:

- **Inline edit** for small surgical changes (rename a function, add a parameter, add an early-return guard).
- **Chat** for slice-level work where you need to discuss intent before code lands.
- Skip autocomplete unless your model is fast enough to keep up — 7B on CPU is typically not.

Continue does not run shell commands. After it produces edits, run the commit ceremony in a terminal:

```bash
node scripts/coa-merge.mjs --message="<type>(<scope>): <summary> (TPL-XXX)"
```

## Variant: Cline + LM Studio + Qwen

Cline is an autonomous VSCode coding agent. More aggressive than Continue — it edits files, runs commands, and iterates until it believes the task is done. The autonomy is powerful but requires careful scoping for local-tier models, which lack the long-horizon reasoning to back out of dead ends gracefully.

### Setup

1. **Install LM Studio and start the model** as above.
2. **Install Cline.** In VSCode, search the marketplace for "Cline" and install.
3. **Configure the API endpoint.** Cline's config lives in VSCode `settings.json`. Open the command palette → "Preferences: Open User Settings (JSON)" and add:

   ```jsonc
   {
     "cline.apiProvider": "openai",
     "cline.openAiBaseUrl": "http://localhost:1234/v1",
     "cline.openAiApiKey": "lm-studio",
     "cline.openAiModelId": "qwen2.5-coder-7b-instruct"
   }
   ```

   (Setting key names follow Cline's current schema — verify against the Cline README if your version differs.)

4. **Set custom instructions.** In the Cline panel, find "Custom Instructions" and paste:

   ```text
   You are working in a Contextrail repository. Read LOCAL.md at the repo
   root before any edits — it is the slim contract for local-tier agents.

   Hard rules:
   - Stay inside ONE module per slice. If you need to wander beyond two
     modules, stop and ask the operator.
   - Before editing files outside your single target module, file a claim
     via `node scripts/checks/claim-check.mjs --acquire --agent=cline
     --slice=<id> --action=modify --targets=<paths>`.
   - Never write `@version <number>` in file headers — leave whatever value
     is there; the pre-commit hook stamps the right number.
   - Do not edit VERSION, package.json's version field, or release
     CHANGELOG sections by hand. Run `node scripts/coa-merge.mjs
     --message="<type>(<scope>): <summary> (TPL-XXX)"` for the commit
     ceremony.
   - TDD by default. Bugfixes start with a failing regression test.
   ```

5. **Reload the IDE** so Cline picks up the new settings.

### Working loop

Cline is autonomous — give it a clearly scoped task and a stop condition:

```
> Add a unit test in modules/example-greeter/ covering the case
> "greet returns the default greeting when no name is provided".
> Stay inside that one test file. Do not modify domain code.
> Stop when the test is added and the suite is green; do NOT commit
> (the operator runs coa-merge).
```

The "do NOT commit" footer matters — Cline's defaults will try to commit unless told otherwise, and `coa-merge` is the canonical ceremony.

## Verifying the setup

Run **task class T1** from the validation experiment as a smoke test. T1 is bounded, deterministic, and exercises the slim contract end-to-end without forcing the model to make a real behavior decision.

> Generate a `.header.md` sidecar for a fresh file at
> `apps/starter/sample.mjs`. The sidecar must follow the canonical
> sparse-YAML format from ADR-0009. Do not modify the file's inline
> header.

**Acceptance:**

- the agent reads `MICRO.md` (or `LOCAL.md` if MICRO is not in context)
- locates the file (or creates it if missing — that is fine for a smoke test)
- produces a sidecar with the right shape: `---` YAML frontmatter, camelCase keys (`fileId`, `module`, `stability`, `steward`, `summary`, `tests`, etc.), no `_none_` padding, then `---` and `# <filename>`
- does not modify other files
- does not file a claim (none required for new-file-only edits)

If the agent does this in one or two attempts within ~5 minutes, your setup is healthy. If it fails repeatedly, see the next section.

## When things go wrong

Failures usually fall into three buckets — and the bucket determines whether the fix lives in your config, your model, or Contextrail itself.

### Symptom: model ignores the claim ceremony

The agent edits files across three modules without filing a claim, the pre-commit hook then blocks the commit.

- **Local fix:** in your harness's system prompt or custom instructions, hoist the claim rule from `LOCAL.md` to the top. 7B-class models often skim long contracts and miss rules that appear past the first ~500 tokens.
- **Reframe the task:** if the task genuinely needs cross-module edits, that is a frontier-tier slice, not a local-tier one. Surface it to the operator.
- **Reference:** `LOCAL.md` → "Coordination — file a claim before cross-file work".

### Symptom: model writes `@version 1.2.3` into headers

The agent guesses a version number and writes it directly. Pre-commit's `header-fix` will overwrite it, but the diff is noisy and a parallel session may have already taken that version.

- **Local fix:** add a hard reminder in custom instructions: "Never write @version in headers. Leave whatever value is there." This rule is in `LOCAL.md` but small models often need it repeated.
- **Reference:** `LOCAL.md` → "Header discipline (ADR-0009)".

### Symptom: model edits VERSION or package.json's version field

Same root cause as above — the model is trying to be helpful and bump the version itself, racing `coa-merge`.

- **Local fix:** explicit instruction: "Do not edit VERSION, package.json's version field, or CHANGELOG section headings. Only run `node scripts/coa-merge.mjs --message=...` for the commit ceremony."
- **Reference:** `LOCAL.md` → "Commit ceremony — use coa-merge".

### Symptom: model "completes" the task but tests fail

The agent declares success without running the suite, or runs only a narrow part.

- **Local fix:** add to custom instructions: "Tests run via the pre-commit hook. Do not declare a task done until you have run `pnpm test:unit` (or the relevant subset) and seen it green."
- **Reference:** `LOCAL.md` → "Test gate".

### Symptom: model wanders across many files / modules

Classic sign that the slice is too big for the local-tier capability — or the framing was too open-ended.

- **Local fix:** rescope the request to one file or one module. Local-tier agents are not slice owners for architecture work; they are scoped to bounded slices. A frontier-tier session should design the slice; a local-tier session executes it.
- **Reference:** `LOCAL.md` → "When the slice gets bigger than this file".

### Symptom: model is consistently unable to follow the contract

If the same model fails task T1 repeatedly across multiple harnesses, the model itself may be below Contextrail's working floor for that task class. Note the model name, harness, attempts, and failure modes in `docs/analysis/field-findings-log.md`. The threshold may need raising in `agentProfiles.small` — that decision lives upstream of this guide.

## See also

- [LOCAL.md](../../LOCAL.md) — the slim contract every local-tier session reads
- [MICRO.md](../../MICRO.md) — the helper contract for narrow deterministic tasks
- [docs/agent-contract/README.md](../agent-contract/README.md) — the full agent contract
- [docs/guides/agent-framework-integration.md](agent-framework-integration.md) — broader vendor-neutral integration patterns
- [docs/guides/inter-agent-coordination.md](inter-agent-coordination.md) — file-based claims and parallel-safety
- [docs/guides/parallel-sessions.md](parallel-sessions.md) — running multiple sessions safely with worktrees

For dispatching real feature tasks (not just one-off chat sessions), see `docs/guides/byollm-feature-dispatch.md` which uses the slice-aware context briefer — for the operator-facing dispatch workflow that uses `agent-context.mjs` brief + Aider invocation.
