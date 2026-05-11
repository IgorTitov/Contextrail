/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the i18n module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx i18n
 * @public false
 * @edit careful
 */

/** Flat key → template map for a single locale. */
export type MessageBundle = Record<string, string>;

/** Plural forms object: category → template string. */
export type PluralForms = Record<string, string>;

/** The port contract that every i18n adapter must satisfy. */
export interface I18nPort {
  t(key: string, params?: Record<string, string | number>): string;
  tp(key: string, count: number, forms: PluralForms, params?: Record<string, string | number>): string;
  setLocale(locale: string): void;
  getLocale(): string;
  getAvailableLocales(): string[];
  registerMessages(namespace: string, locale: string, messages: MessageBundle): void;
  formatNumber(n: number, opts?: Intl.NumberFormatOptions): string;
  formatDate(d: Date, opts?: Intl.DateTimeFormatOptions): string;
  formatCurrency(amount: number, currency: string, opts?: Intl.NumberFormatOptions): string;
}

/** Options for createIntlAdapter(). */
export interface IntlAdapterOptions {
  defaultLocale?: string;
  initialMessages?: Record<string, Record<string, MessageBundle>>;
}

/** Options for createMemoryI18nAdapter(). */
export interface MemoryAdapterOptions {
  defaultLocale?: string;
  initialMessages?: Record<string, Record<string, MessageBundle>>;
}

/** Message registry instance. */
export interface MessageRegistry {
  register(namespace: string, locale: string, messages: MessageBundle): void;
  resolve(locale: string, key: string): string | undefined;
  getAvailableLocales(): string[];
  getKeysForLocale(locale: string): string[];
  clear(): void;
}

/** Plural resolver instance. */
export interface PluralResolver {
  resolve(count: number, forms: PluralForms): string;
}

/** Available plural categories per CLDR. */
export const PLURAL_CATEGORIES: readonly string[];

export function interpolate(template: string, params?: Record<string, string | number>): string;
export function createPluralResolver(locale: string): PluralResolver;
export function createMessageRegistry(): MessageRegistry;
export function buildFallbackChain(locale: string, defaultLocale: string): string[];
export function resolveWithFallback(
  chain: string[],
  registry: Pick<MessageRegistry, 'resolve'>,
  key: string,
): string | undefined;

export function assertI18nPort(adapter: unknown): asserts adapter is I18nPort;
export function createIntlAdapter(options?: IntlAdapterOptions): I18nPort;
export function createMemoryI18nAdapter(options?: MemoryAdapterOptions): I18nPort;

export function t(key: string, params?: Record<string, string | number>): string;
export function setLocale(locale: string): void;
export function getLocale(): string;
export function registerLocale(locale: string, messages: MessageBundle): void;
export function resetLocale(): void;
