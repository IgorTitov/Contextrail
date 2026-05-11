<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the log hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx log
@public false
@edit careful -->

# log

Hexagonal bounded module for structured logging with pluggable adapters.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/log-levels.mjs` | Log level priority map and `shouldLog()` filter |
| Ports | `ports/log-port.mjs` | `LogPort` contract + `assertLogPort()` validator |
| Adapters | `adapters/console-adapter.mjs` | Browser/Node console adapter with scope prefix |
| Adapters | `adapters/structured-json-adapter.mjs` | Single JSON-line adapter |
| Adapters | `adapters/no-op-adapter.mjs` | Silent no-op adapter for tests |
| Adapters | `adapters/remote-adapter.mjs` | Buffered HTTP POST adapter with flush/destroy |
| Adapters | `adapters/file-adapter.mjs` | Server-side file/stream adapter with driver injection (isomorphic proof) |
| Public API | `public-api.mjs` | Single cross-module entry point |
| Messages | `messages.mjs` | i18n message layer for port assertions |

## Usage

```js
import {
  createConsoleAdapter,
  assertLogPort,
} from '../../modules/log/public-api.mjs';

const logger = createConsoleAdapter({ minLevel: 'info' });
assertLogPort(logger);

logger.info('Application started');
logger.error('Something failed', { code: 500 });

const child = logger.child('db');
child.warn('Slow query', { ms: 120 });
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
