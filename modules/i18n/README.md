<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the i18n hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx i18n
@public false
@edit careful -->

# i18n

Hexagonal bounded module for internationalization with pluggable adapters.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/interpolation.mjs` | String interpolation (`{name}` → value) |
| Domain | `domain/pluralization.mjs` | Locale-aware plural form selection via `Intl.PluralRules` |
| Domain | `domain/message-registry.mjs` | Central registry collecting message bundles from all modules |
| Domain | `domain/locale-resolver.mjs` | BCP 47 fallback chain resolution (`ru-RU` → `ru` → `en`) |
| Ports | `ports/i18n-port.mjs` | `I18nPort` contract + `assertI18nPort()` validator |
| Adapters | `adapters/intl-adapter.mjs` | Production adapter using browser Intl API |
| Adapters | `adapters/memory-adapter.mjs` | Simple in-memory adapter for testing |
| Public API | `public-api.mjs` | Single cross-module entry point |
| Messages | `messages.mjs` | i18n message layer for port assertions |

## Usage

```js
import {
  createIntlAdapter,
  assertI18nPort,
} from '../../modules/i18n/public-api.mjs';

const i18n = createIntlAdapter({ defaultLocale: 'en' });
assertI18nPort(i18n);

// Register message bundles from modules
i18n.registerMessages('app', 'en', {
  'app.greeting': 'Hello, {name}!',
  'app.items': '{count} items',
});
i18n.registerMessages('app', 'ru', {
  'app.greeting': 'Привет, {name}!',
  'app.items': '{count} элементов',
});

// Translate
i18n.t('app.greeting', { name: 'World' }); // "Hello, World!"

// Pluralize
i18n.tp('items', 3, {
  one: '{count} item',
  other: '{count} items',
}); // "3 items"

// Format numbers, dates, currencies
i18n.formatNumber(1234.5);                   // "1,234.5"
i18n.formatDate(new Date());                 // locale-formatted date
i18n.formatCurrency(9.99, 'USD');            // "$9.99"

// Switch locale
i18n.setLocale('ru');
i18n.t('app.greeting', { name: 'Мир' });    // "Привет, Мир!"
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- Each module keeps its own `messages.mjs`; the i18n module collects them via `registerMessages()`.
