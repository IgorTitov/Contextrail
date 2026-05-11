---
fileId: contextrail-template:modules:seo:memory-seo-publisher
module: modules/seo
stability: experimental
steward: seo-module
api: Adapter
boundedContext: seo
summary: In-memory Map-backed SeoPublisherPort adapter — stores sitemap XML, robots text, and meta snippets with defensive copies.
owns: createMemorySeoPublisher.
boundaries: No network, no filesystem. All state lives in a closure-local Map.
invariants: Empty sitemap XML, empty robots text, and empty pageId are rejected. listAssets returns fresh copies — mutation cannot leak back into the store. publishedAt comes from the injectable clock, defaulting to Date.now.
specRefs:
  - TPL-001
---

# memory-seo-publisher.mjs
