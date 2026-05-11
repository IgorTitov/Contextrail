/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Blob adapter for the file module.
 * @sidecar blob-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx file
 * @public false
 * @edit careful
 */

/**
 * Browser Blob/File adapter implementing the FilePort contract.
 * Uses only native browser APIs (fetch, XMLHttpRequest, FileReader, URL).
 *
 * SpecRefs: TPL-161
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

/**
 * Create a browser-based file adapter using Blob/File APIs.
 *
 * @param {{ endpoint?: string, headers?: Record<string, string> }} [options]
 * @returns {FilePort & { destroy: () => void }}
 */
export function createBlobAdapter(options = {}) {
  const { endpoint = '/upload', headers = {} } = options;

  /** @type {string[]} */
  const objectUrls = [];

  /**
   * @param {File | Blob} file
   * @param {FileOptions} [uploadOptions]
   * @returns {Promise<FileResult>}
   */
  async function upload(file, uploadOptions = {}) {
    const fileId = generateFileId();
    const targetEndpoint = uploadOptions.endpoint || endpoint;
    const mergedHeaders = { ...headers, ...(uploadOptions.headers || {}) };

    try {
      if (uploadOptions.onProgress && typeof XMLHttpRequest !== 'undefined') {
        return await _uploadWithProgress(
          file,
          fileId,
          targetEndpoint,
          mergedHeaders,
          uploadOptions.onProgress,
        );
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: mergedHeaders,
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: t('file.upload.failed', { reason: response.statusText }) };
      }

      const metadata = _extractMetadata(file);
      return {
        success: true,
        handle: { id: fileId, metadata },
      };
    } catch (err) {
      return { success: false, error: t('file.upload.failed', { reason: err.message }) };
    }
  }

  /**
   * @param {File | Blob} file
   * @param {string} fileId
   * @param {string} targetEndpoint
   * @param {Record<string, string>} hdrs
   * @param {(p: import('../ports/file-port.mjs').FileProgress) => void} onProgress
   * @returns {Promise<FileResult>}
   */
  function _uploadWithProgress(file, fileId, targetEndpoint, hdrs, onProgress) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', targetEndpoint);

      for (const [key, value] of Object.entries(hdrs)) {
        xhr.setRequestHeader(key, value);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            fileId,
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const metadata = _extractMetadata(file);
          resolve({ success: true, handle: { id: fileId, metadata } });
        } else {
          resolve({ success: false, error: t('file.upload.failed', { reason: xhr.statusText }) });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ success: false, error: t('file.upload.failed', { reason: 'Network error' }) });
      });

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });
  }

  /**
   * @param {string} url
   * @param {FileOptions} [downloadOptions]
   * @returns {Promise<FileResult>}
   */
  async function download(url, downloadOptions = {}) {
    const fileId = generateFileId();
    const mergedHeaders = { ...headers, ...(downloadOptions.headers || {}) };

    try {
      const response = await fetch(url, { headers: mergedHeaders });

      if (!response.ok) {
        return {
          success: false,
          error: t('file.download.failed', { reason: response.statusText }),
        };
      }

      if (
        downloadOptions.onProgress &&
        response.body &&
        typeof response.body.getReader === 'function'
      ) {
        const contentLength = Number(response.headers.get('content-length') || 0);
        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;

          if (contentLength > 0) {
            downloadOptions.onProgress({
              fileId,
              loaded,
              total: contentLength,
              percent: Math.round((loaded / contentLength) * 100),
            });
          }
        }

        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);
        objectUrls.push(blobUrl);

        const name = _nameFromUrl(url);
        return {
          success: true,
          handle: {
            id: fileId,
            metadata: {
              name,
              size: blob.size,
              mimeType: blob.type || detectMimeType(name),
              extension: getExtension(name),
            },
            url: blobUrl,
          },
        };
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      objectUrls.push(blobUrl);

      const name = _nameFromUrl(url);
      return {
        success: true,
        handle: {
          id: fileId,
          metadata: {
            name,
            size: blob.size,
            mimeType: blob.type || detectMimeType(name),
            extension: getExtension(name),
          },
          url: blobUrl,
        },
      };
    } catch (err) {
      return { success: false, error: t('file.download.failed', { reason: err.message }) };
    }
  }

  /**
   * @param {File | Blob} file
   * @param {'text' | 'arrayBuffer' | 'dataUrl'} [format='text']
   * @returns {Promise<string | ArrayBuffer>}
   */
  function read(file, format = 'text') {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        reject(new Error(t('file.read.failed', { reason: 'FileReader not available' })));
        return;
      }

      const reader = new FileReader();

      reader.addEventListener('load', () => resolve(reader.result));
      reader.addEventListener('error', () =>
        reject(
          new Error(t('file.read.failed', { reason: reader.error?.message || 'Unknown error' })),
        ),
      );

      switch (format) {
        case 'arrayBuffer':
          reader.readAsArrayBuffer(file);
          break;
        case 'dataUrl':
          reader.readAsDataURL(file);
          break;
        case 'text':
        default:
          reader.readAsText(file);
          break;
      }
    });
  }

  /**
   * @param {File | Blob} file
   * @returns {string}
   */
  function preview(file) {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    return url;
  }

  /**
   * @param {File | Blob} file
   * @returns {FileMetadata}
   */
  function getMetadata(file) {
    return _extractMetadata(file);
  }

  /**
   * @param {string} [_path]
   * @param {object} [_options]
   * @returns {Promise<FileHandle[]>}
   */
  async function list(_path, _options) {
    // Listing is not applicable in browser context
    return [];
  }

  /**
   * Revoke all created object URLs to free memory.
   */
  function destroy() {
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
    objectUrls.length = 0;
  }

  /**
   * @param {File | Blob} file
   * @returns {FileMetadata}
   */
  function _extractMetadata(file) {
    const name = /** @type {any} */ (file).name || 'unknown';
    const size = file.size || 0;
    const mimeType = file.type || detectMimeType(name);
    const extension = getExtension(name);
    const lastModified = /** @type {any} */ (file).lastModified;

    return {
      name,
      size,
      mimeType,
      ...(extension ? { extension } : {}),
      ...(lastModified != null ? { lastModified } : {}),
    };
  }

  /**
   * @param {string} url
   * @returns {string}
   */
  function _nameFromUrl(url) {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'download';
    } catch {
      return 'download';
    }
  }

  const adapter = { upload, download, read, preview, getMetadata, list, destroy };
  assertFilePort(adapter);
  return adapter;
}
