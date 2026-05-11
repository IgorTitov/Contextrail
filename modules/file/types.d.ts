/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the file module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx file
 * @public false
 * @edit careful
 */

/**
 * Core type definitions for the file module.
 *
 * SpecRefs: TPL-160, TPL-161, TPL-162
 */

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  lastModified?: number;
  extension?: string;
}

export interface FileHandle {
  id: string;
  metadata: FileMetadata;
  url?: string;
}

export interface FileProgress {
  fileId: string;
  loaded: number;
  total: number;
  percent: number;
}

export interface FileResult {
  success: boolean;
  handle?: FileHandle;
  error?: string;
}

export interface FileOptions {
  endpoint?: string;
  headers?: Record<string, string>;
  chunkSize?: number;
  onProgress?: (progress: FileProgress) => void;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export interface FilePort {
  upload(file: unknown, options?: FileOptions): Promise<FileResult>;
  download(url: string, options?: FileOptions): Promise<FileResult>;
  read(file: unknown, format?: 'text' | 'arrayBuffer' | 'dataUrl'): Promise<string | ArrayBuffer>;
  preview(file: unknown): string;
  getMetadata(file: unknown): FileMetadata;
  list(path?: string, options?: object): Promise<FileHandle[]>;
}

export declare function assertFilePort(adapter: unknown): asserts adapter is FilePort;
export declare function detectMimeType(file: { name?: string } | string): string;
export declare function getExtension(filename: string): string;
export declare const MIME_TYPES: Record<string, string>;
export declare function validateFile(
  file: { name?: string; size?: number; type?: string },
  options?: FileValidationOptions,
): { valid: boolean; errors: string[] };
export declare function formatFileSize(bytes: number): string;
export declare function generateFileId(): string;
export declare function createBlobAdapter(options?: {
  endpoint?: string;
  headers?: Record<string, string>;
}): FilePort & { destroy(): void };
export declare function createFileSystemAdapter(options: {
  basePath: string;
}): FilePort & { getMetadataAsync(filePath: string): Promise<FileMetadata> };
