/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide TypeScript type declarations for messages.mjs, declaring the i18n function signatures for the local-llm module.
 * @sidecar messages.d.ts.header.md
 * @layer module | @hex _none_ | @ctx local-llm
 * @public false
 * @edit careful
 */

/**
 * TypeScript sidecar for messages.mjs.
 *
 * SpecRefs: TPL-080
 */

export function t(key: string, params?: Record<string, string | number>): string;
export function setLocale(locale: string): void;
export function getLocale(): string;
export function registerLocale(locale: string, messages: Record<string, string>): void;
export function resetLocale(): void;
