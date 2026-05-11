<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document the starter app integration for the local-llm module: the panel component, adapter initialization, bounded selector registry, and app-level i18n messages.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# local-llm

Starter app integration for the local-llm module.

Provides:
- **Local LLM panel** — model selection, loading progress, status indicators, cache management
- **Feature-seam integration** — adapter swap from echo to local LLM via feature-seams mechanism
- **Bounded UI selectors** and **i18n messages** for the local LLM feature
