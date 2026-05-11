---
fileId: contextrail-template:continue:config-template-json
module: .continue
stability: evolving
steward: shared
api: Configuration template
dependsOn:
  - LOCAL.md
  - docs/guides/local-frameworks.md
summary: Continue (VSCode/JetBrains) configuration template that wires a local LM Studio endpoint, references LOCAL.md as system prompt, and seeds Contextrail's working rules.
owns: The hand-authored Continue config seed for contributors using the Continue extension against a Contextrail repo.
boundaries: This is a copy-and-adapt template. The un-suffixed `.continue/config.json` is gitignored and operator-local. Policy belongs in LOCAL.md, not in `rules[]` here — the rules are short reminders that point back at LOCAL.md.
invariants: systemMessage references LOCAL.md; rules[] cover claim-before-cross-module, commit-via-coa-merge, header-version-untouched, and small-slices-only; apiBase defaults to LM Studio's local endpoint.
risks: Continue's config schema may evolve. Verify against the current Continue docs when bumping the model/provider lines.
securityPrivacy: Contains no real credentials — apiKey is a placeholder string local servers ignore. Contributors must not commit cloud API keys under this filename.
notesForLLM: Read this when a user asks how to run Continue against a Contextrail repo. Point them at docs/guides/local-frameworks.md for the full setup recipe.
linkedDocs:
  - docs/guides/local-frameworks.md
  - LOCAL.md
related:
  - .aider.conf.yml.template
  - docs/guides/agent-framework-integration.md
---

# config.template.json
