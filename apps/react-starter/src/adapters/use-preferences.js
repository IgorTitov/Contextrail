/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Preferences adapter hook for the react-starter React app.
 * @sidecar use-preferences.js.header.md
 * @layer app | @hex adapter | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * React adapter for the hex user-preferences module.
 *
 * Domain logic (defaultPreferences, mergePreferences, assertStoragePort)
 * comes from modules/user-preferences — unchanged, framework-free.
 * This hook adds React state and localStorage persistence.
 */

import { useState, useCallback, useRef } from 'react';
import {
  defaultPreferences,
  mergePreferences,
  assertStoragePort,
  createLocalStorageAdapter,
  createMemoryAdapter,
} from '@modules/user-preferences/public-api.mjs';

/**
 * Create a storage adapter with graceful fallback.
 * @returns {object}
 */
function createStorage() {
  try {
    const adapter = createLocalStorageAdapter('contextrail-react-prefs');
    assertStoragePort(adapter);
    return adapter;
  } catch {
    return createMemoryAdapter();
  }
}

/**
 * React hook wrapping the hex user-preferences port adapter.
 *
 * @returns {{
 *   preferences: object,
 *   updatePreferences: (partial: object) => void,
 * }}
 */
export function usePreferences() {
  const storageRef = useRef(null);
  if (!storageRef.current) {
    storageRef.current = createStorage();
  }

  const [preferences, setPreferences] = useState(() => {
    const saved = storageRef.current.load();
    return saved ? mergePreferences(defaultPreferences(), saved) : defaultPreferences();
  });

  const updatePreferences = useCallback((partial) => {
    setPreferences((prev) => {
      const next = mergePreferences(prev, partial);
      storageRef.current.save(next);
      return next;
    });
  }, []);

  return { preferences, updatePreferences };
}
