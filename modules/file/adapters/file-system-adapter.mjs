/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose File System adapter for the file module.
 * @sidecar file-system-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx file
 * @public false
 * @edit careful
 */

/**
 * Node.js filesystem adapter implementing the FilePort contract.
 * Uses dynamic imports for node:fs/promises and node:path so the module
 * can be loaded in browser environments without error.
 *
 * SpecRefs: TPL-162
 */

import { assertFilePort } from '../ports/file-port.mjs';
import { t } from '../messages.mjs';
import { detectMimeType, getExtension } from '../domain/mime-detection.mjs';
import { generateFileId } from '../domain/file-utils.mjs';

/**
 * @typedef {import('../ports/file-port.mjs').FilePort} FilePort
 * @typedef {import('../ports/file-port.mjs').FileOptions} FileOptions
 * @typedef {import('../ports/file-port.mjs').FileResult} FileResult
 * @typedef {import('../ports/file-port.mjs').FileMetadata} FileMetadata
 * @typedef {import('../ports/file-port.mjs').FileHandle} FileHandle
 */

/** @type {typeof import('node:fs/promises') | null} */
let _fs = null;

/** @type {typeof import('node:path') | null} */
let _path = null;

/**
 * Lazily load Node.js built-in modules.
 * Throws a clear error if called in a browser environment.
 */
async function ensureNodeModules() {
  if (_fs && _path) return;
  try {
    _fs = await import('node:fs/promises');
    _path = await import('node:path');
  } catch {
    throw new Error(t('file.fs.browser_unsupported'));
  }
}

/**
 * Create a Node.js filesystem-based file adapter.
 *
 * @param {{ basePath: string }} options
 * @returns {FilePort}
 */
export function createFileSystemAdapter(options) {
  if (!options?.basePath) {
    throw new Error(t('file.fs.base_path_required'));
  }

  const { basePath } = options;

  /**
   * @param {any} file - File-like object with name and data, or a Buffer/string
   * @param {FileOptions} [uploadOptions]
   * @returns {Promise<FileResult>}
   */
  async function upload(file, _uploadOptions = {}) {
    await ensureNodeModules();
    const fileId = generateFileId();

    try {
      const name = file.name || `upload-${fileId}`;
      const filePath = _path.join(basePath, name);
      const data = file.data || file.content || file;

      await _fs.mkdir(basePath, { recursive: true });
      await _fs.writeFile(filePath, data);

      const stats = await _fs.stat(filePath);
      const metadata = {
        name,
        size: stats.size,
        mimeType: detectMimeType(name),
        extension: getExtension(name),
        lastModified: stats.mtimeMs,
      };

      return { success: true, handle: { id: fileId, metadata, url: filePath } };
    } catch (err) {
      return { success: false, error: t('file.upload.failed', { reason: err.message }) };
    }
  }

  /**
   * @param {string} filePath
   * @param {FileOptions} [downloadOptions]
   * @returns {Promise<FileResult>}
   */
  async function download(filePath, _downloadOptions = {}) {
    await ensureNodeModules();
    const fileId = generateFileId();

    try {
      const resolvedPath = _path.isAbsolute(filePath) ? filePath : _path.join(basePath, filePath);

      await _fs.access(resolvedPath);
      const _data = await _fs.readFile(resolvedPath);
      const stats = await _fs.stat(resolvedPath);
      const name = _path.basename(resolvedPath);

      return {
        success: true,
        handle: {
          id: fileId,
          metadata: {
            name,
            size: stats.size,
            mimeType: detectMimeType(name),
            extension: getExtension(name),
            lastModified: stats.mtimeMs,
          },
          url: resolvedPath,
        },
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { success: false, error: t('file.fs.not_found', { path: filePath }) };
      }
      return { success: false, error: t('file.download.failed', { reason: err.message }) };
    }
  }

  /**
   * @param {any} file - A file path (string) or File-like object with name
   * @param {'text' | 'arrayBuffer' | 'dataUrl'} [format='text']
   * @returns {Promise<string | Buffer>}
   */
  async function read(file, format = 'text') {
    await ensureNodeModules();

    try {
      const filePath =
        typeof file === 'string'
          ? _path.isAbsolute(file)
            ? file
            : _path.join(basePath, file)
          : _path.join(basePath, file.name || 'unknown');

      switch (format) {
        case 'text':
          return await _fs.readFile(filePath, 'utf8');
        case 'arrayBuffer': {
          const buf = await _fs.readFile(filePath);
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        }
        case 'dataUrl': {
          const buf = await _fs.readFile(filePath);
          const name = _path.basename(filePath);
          const mime = detectMimeType(name);
          const base64 = buf.toString('base64');
          return `data:${mime};base64,${base64}`;
        }
        default:
          return await _fs.readFile(filePath, 'utf8');
      }
    } catch (err) {
      throw new Error(t('file.read.failed', { reason: err.message }), { cause: err });
    }
  }

  /**
   * @param {any} file - A file path (string) or File-like object with name
   * @returns {string}
   */
  function preview(file) {
    const filePath =
      typeof file === 'string'
        ? _path?.isAbsolute(file)
          ? file
          : _path
            ? _path.join(basePath, file)
            : `${basePath}/${file}`
        : _path
          ? _path.join(basePath, file.name || 'unknown')
          : `${basePath}/${file.name || 'unknown'}`;

    return `file://${filePath}`;
  }

  /**
   * @param {any} file - A file path (string) or File-like object with name
   * @returns {FileMetadata}
   */
  function getMetadata(file) {
    // Synchronous version for basic info; for full stat data use the async path
    const name = typeof file === 'string' ? file.split('/').pop() || file : file.name || 'unknown';
    const size = file.size || 0;
    const mimeType = file.type || detectMimeType(name);
    const extension = getExtension(name);
    const lastModified = file.lastModified;

    return {
      name,
      size,
      mimeType,
      ...(extension ? { extension } : {}),
      ...(lastModified != null ? { lastModified } : {}),
    };
  }

  /**
   * Async version of getMetadata using fs.stat.
   *
   * @param {string} filePath
   * @returns {Promise<FileMetadata>}
   */
  async function getMetadataAsync(filePath) {
    await ensureNodeModules();
    const resolvedPath = _path.isAbsolute(filePath) ? filePath : _path.join(basePath, filePath);
    const stats = await _fs.stat(resolvedPath);
    const name = _path.basename(resolvedPath);

    return {
      name,
      size: stats.size,
      mimeType: detectMimeType(name),
      extension: getExtension(name),
      lastModified: stats.mtimeMs,
    };
  }

  /**
   * @param {string} [dirPath]
   * @param {{ extensions?: string[] }} [listOptions]
   * @returns {Promise<FileHandle[]>}
   */
  async function list(dirPath, listOptions = {}) {
    await ensureNodeModules();

    const targetDir = dirPath
      ? _path.isAbsolute(dirPath)
        ? dirPath
        : _path.join(basePath, dirPath)
      : basePath;

    try {
      const entries = await _fs.readdir(targetDir);
      const handles = [];

      for (const entry of entries) {
        const ext = getExtension(entry);
        if (listOptions.extensions && listOptions.extensions.length > 0) {
          if (!ext || !listOptions.extensions.includes(ext)) continue;
        }

        const filePath = _path.join(targetDir, entry);
        try {
          const stats = await _fs.stat(filePath);
          if (!stats.isFile()) continue;

          handles.push({
            id: generateFileId(),
            metadata: {
              name: entry,
              size: stats.size,
              mimeType: detectMimeType(entry),
              extension: ext || undefined,
              lastModified: stats.mtimeMs,
            },
            url: filePath,
          });
        } catch {
          // Skip entries we cannot stat
        }
      }

      return handles;
    } catch {
      return [];
    }
  }

  const adapter = { upload, download, read, preview, getMetadata, list, getMetadataAsync };
  assertFilePort(adapter);
  return adapter;
}
