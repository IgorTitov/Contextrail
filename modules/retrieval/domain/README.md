<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Describe the domain layer of the retrieval module, which contains framework-free text chunking and prompt augmentation utilities.
@sidecar README.md.header.md
@layer module | @hex domain | @ctx retrieval
@public false
@edit careful -->

# domain

Pure domain utilities for the retrieval module.

- `chunker.mjs` -- text splitting with configurable overlap and metadata
- `augment-prompt.mjs` -- context-augmented prompt formatting pipeline
