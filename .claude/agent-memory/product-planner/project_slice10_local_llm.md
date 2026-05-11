---
name: Slice 10 - In-Browser LLM Module
description: TPL-079 epic with TPL-080 through TPL-085 tasks for local-llm hex module providing in-browser LLM adapters via WebLLM and Transformers.js
type: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Describe the role of project-slice10-local-llm in this repository.
@sidecar project_slice10_local_llm.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

Slice 10 introduces the local-llm hex module at modules/local-llm/.

**Why:** Extend the ai-chat infrastructure so the starter template can run LLM inference directly in the browser without a backend server.

**How to apply:** The local-llm module conforms to AiChatPort from ai-chat, so consumers wired for ai-chat can swap in a local adapter. Key design decisions: dynamic imports for WebLLM and Transformers.js (no bundling), no model weights shipped, runtime capability checks for WebGPU/WASM, LocalLlmPort composes with AiChatPort by adding loadModel/unloadModel/isModelLoaded lifecycle methods. PRD at docs/prd/local-llm.md, backlog at docs/backlog/local-llm.md. USM intentionally skipped (technical/architectural work). Created 2026-03-29.
