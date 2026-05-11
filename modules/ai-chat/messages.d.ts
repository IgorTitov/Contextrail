/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Messages.D implementation for the ai-chat module.
 * @sidecar messages.d.ts.header.md
 * @layer module | @hex _none_ | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the ai-chat messages layer.
 *
 * SpecRefs: TPL-072
 */

export function setLocale(locale: string): void;
export function getLocale(): string;
export function t(key: string, params?: Record<string, string | number>): string;
export function registerLocale(locale: string, messages: Record<string, string>): void;
export function resetLocale(): void;
