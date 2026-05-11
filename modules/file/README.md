<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the file hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx file
@public false
@edit careful -->

# file

Hexagonal bounded module for file operations (upload, download, read, preview, metadata, listing).

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/mime-detection.mjs` | MIME type detection from file extensions |
| Domain | `domain/file-validation.mjs` | File validation (size, MIME type, extension) |
| Domain | `domain/file-utils.mjs` | Formatting and ID generation utilities |
| Ports | `ports/file-port.mjs` | `FilePort` contract + `assertFilePort()` validator |
| Adapters | `adapters/blob-adapter.mjs` | Browser Blob/File API adapter |
| Adapters | `adapters/file-system-adapter.mjs` | Node.js filesystem adapter |
| Messages | `messages.mjs` | i18n message layer for all user-facing copy |
| Public API | `public-api.mjs` | Single cross-module entry point |

## Usage

```js
import {
  detectMimeType,
  validateFile,
  formatFileSize,
  createFileSystemAdapter,
  assertFilePort,
} from '../../modules/file/public-api.mjs';

// Detect MIME type from filename
detectMimeType('photo.jpg'); // 'image/jpeg'

// Validate a file
validateFile(
  { name: 'doc.pdf', size: 5000, type: 'application/pdf' },
  { maxSize: 10000, allowedMimeTypes: ['application/pdf'] },
);

// Format bytes
formatFileSize(1536); // '1.5 KB'

// Use the filesystem adapter (Node.js only)
const adapter = createFileSystemAdapter({ basePath: '/tmp/uploads' });
assertFilePort(adapter);
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- FileSystemAdapter uses dynamic imports for Node builtins so the module can load in browser environments.
- All user-facing copy goes through `messages.mjs`.
