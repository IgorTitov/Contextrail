/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose File port contract for the file module.
 * @sidecar file-port.mjs.header.md
 * @layer module | @hex port | @ctx file
 * @public false
 * @edit careful
 */

/**
 * Port contract for file operation adapters.
 *
 * SpecRefs: TPL-160
 */

import { t } from '../messages.mjs';

/**
 * @typedef {object} FileMetadata
 * @property {string} name
 * @property {number} size
 * @property {string} mimeType
 * @property {number} [lastModified]
 * @property {string} [extension]
 */

/**
 * @typedef {object} FileHandle
 * @property {string} id
 * @property {FileMetadata} metadata
 * @property {string} [url]
 */

/**
 * @typedef {object} FileProgress
 * @property {string} fileId
 * @property {number} loaded
 * @property {number} total
 * @property {number} percent
 */

/**
 * @typedef {object} FileResult
 * @property {boolean} success
 * @property {FileHandle} [handle]
 * @property {string} [error]
 */

/**
 * @typedef {object} FileOptions
 * @property {string} [endpoint]
 * @property {Record<string, string>} [headers]
 * @property {number} [chunkSize]
 * @property {(progress: FileProgress) => void} [onProgress]
 */

/**
 * @typedef {object} FileValidationOptions
 * @property {number} [maxSize]
 * @property {string[]} [allowedMimeTypes]
 * @property {string[]} [allowedExtensions]
 */

/**
 * @typedef {object} FilePort
 * @property {(file: any, options?: FileOptions) => Promise<FileResult>} upload
 * @property {(url: string, options?: FileOptions) => Promise<FileResult>} download
 * @property {(file: any, format?: 'text' | 'arrayBuffer' | 'dataUrl') => Promise<any>} read
 * @property {(file: any) => string} preview
 * @property {(file: any) => FileMetadata} getMetadata
 * @property {(path?: string, options?: object) => Promise<FileHandle[]>} list
 */

const REQUIRED_METHODS = ['upload', 'download', 'read', 'preview', 'getMetadata', 'list'];

/**
 * Validate that an adapter conforms to the FilePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertFilePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('file.port.must_be_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('file.port.missing_method', { method }));
    }
  }
}
