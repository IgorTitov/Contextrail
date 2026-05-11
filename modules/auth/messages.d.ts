/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Messages.D implementation for the auth module.
 * @sidecar messages.d.ts.header.md
 * @layer module | @hex _none_ | @ctx auth
 * @public false
 * @edit careful
 */

/**
 * Type definitions for auth i18n messages.
 *
 * SpecRefs: TPL-062
 */

export function setLocale(locale: string): void;
export function getLocale(): string;
export function t(key: string, params?: Record<string, string | number>): string;
export function registerLocale(locale: string, messages: Record<string, string>): void;
export function resetLocale(): void;
