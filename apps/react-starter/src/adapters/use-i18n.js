/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose I18n adapter hook for the react-starter React app.
 * @sidecar use-i18n.js.header.md
 * @layer app | @hex adapter | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * React adapter for the hex i18n module.
 *
 * Domain logic (interpolate, buildFallbackChain, createIntlAdapter)
 * comes from modules/i18n — unchanged, framework-free.
 * This hook adds React state for locale switching.
 */

import { useState, useCallback, useRef } from 'react';
import { createIntlAdapter, assertI18nPort } from '@modules/i18n/public-api.mjs';

/**
 * React hook wrapping the hex i18n port adapter.
 *
 * @param {{ defaultLocale?: string, messages?: Record<string, Record<string, string>> }} options
 * @returns {{
 *   t: (key: string, params?: Record<string, string>) => string,
 *   locale: string,
 *   setLocale: (locale: string) => void,
 * }}
 */
export function useI18n(options = {}) {
  const adapterRef = useRef(null);
  if (!adapterRef.current) {
    adapterRef.current = createIntlAdapter({
      defaultLocale: options.defaultLocale || 'en',
    });
    assertI18nPort(adapterRef.current);

    if (options.messages) {
      for (const [locale, msgs] of Object.entries(options.messages)) {
        adapterRef.current.registerLocale(locale, msgs);
      }
    }
  }

  const [locale, setLocaleState] = useState(adapterRef.current.getLocale());

  const setLocale = useCallback((newLocale) => {
    adapterRef.current.setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key, params) => adapterRef.current.t(key, params),
    [locale],
  );

  return { t, locale, setLocale };
}
