<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for pwa/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/pwa/adapters/

Infrastructure adapters for the pwa module. Ships the in-memory `createMemoryPwaAssetStore` used by tests and the api-starter demo. Real deployments plug a filesystem-, S3-, or CDN-upload adapter behind the same `PwaAssetPort`.
