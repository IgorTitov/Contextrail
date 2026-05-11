<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for seo/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/seo/adapters/

Infrastructure adapters for the seo module. Ships the in-memory `createMemorySeoPublisher` used by tests and the api-starter demo. Real deployments plug a filesystem-, S3-, or CDN-upload adapter behind the same `SeoPublisherPort`.
