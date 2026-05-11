/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript declarations for messages.mjs i18n functions.
 * @sidecar messages.d.ts.header.md
 * @layer module | @hex _none_ | @ctx retrieval
 * @public false
 * @edit sync-only
 */

/**
 * Type declarations for retrieval messages.mjs
 *
 * SpecRefs: TPL-087
 */

export declare function t(key: string, params?: Record<string, string | number>): string;
export declare function setLocale(locale: string): void;
export declare function getLocale(): string;
export declare function registerLocale(locale: string, messages: Record<string, string>): void;
export declare function resetLocale(): void;
