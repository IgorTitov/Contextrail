<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for seo/domain.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/seo/domain/

Pure domain logic for the seo module. Framework-free, no DOM, no filesystem, no network. Contains the meta-tag descriptor + HTML renderer, the sitemap value object + XML renderer, and the robots.txt value object + text renderer. Every user-controlled value is escaped at render time.
