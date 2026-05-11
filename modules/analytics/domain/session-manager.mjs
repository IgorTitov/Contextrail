/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Session Manager domain logic for the analytics module.
 * @sidecar session-manager.mjs.header.md
 * @layer module | @hex domain | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Session management for the analytics module.
 * Tracks session state with configurable timeout and optional sessionStorage persistence.
 */

/**
 * Generate a UUID-like session ID using random values.
 * @returns {string}
 */
function generateSessionId() {
  const hex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

const STORAGE_KEY = 'analytics_session';

/**
 * @typedef {object} SessionManagerOptions
 * @property {number} [timeout] - Session timeout in milliseconds. Default: 30 * 60 * 1000 (30 minutes).
 */

/**
 * Create a session manager that tracks analytics sessions.
 *
 * @param {SessionManagerOptions} [options]
 */
export function createSessionManager(options = {}) {
  const timeout = options.timeout ?? 30 * 60 * 1000;

  /** @type {import('../ports/analytics-port.mjs').SessionInfo} */
  let session;

  /**
   * Try to load session from sessionStorage if available.
   * @returns {import('../ports/analytics-port.mjs').SessionInfo | null}
   */
  function loadFromStorage() {
    try {
      if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.getItem === 'function') {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed.sessionId === 'string' &&
            typeof parsed.startedAt === 'number'
          ) {
            return parsed;
          }
        }
      }
    } catch {
      // sessionStorage unavailable or corrupt; ignore
    }
    return null;
  }

  /**
   * Persist session to sessionStorage if available.
   */
  function saveToStorage() {
    try {
      if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.setItem === 'function') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // sessionStorage unavailable; ignore
    }
  }

  /**
   * Create a fresh session.
   * @returns {import('../ports/analytics-port.mjs').SessionInfo}
   */
  function createFreshSession() {
    const now = Date.now();
    return {
      sessionId: generateSessionId(),
      startedAt: now,
      pageViews: 0,
      lastActivity: now,
    };
  }

  // Initialize: try storage first, then create fresh
  const stored = loadFromStorage();
  if (stored) {
    session = stored;
  } else {
    session = createFreshSession();
    saveToStorage();
  }

  return {
    /**
     * Get the current session info.
     * @returns {import('../ports/analytics-port.mjs').SessionInfo}
     */
    getSession() {
      return { ...session };
    },

    /**
     * Update lastActivity timestamp. If the session has expired, creates a new one.
     */
    touch() {
      if (Date.now() - session.lastActivity > timeout) {
        session = createFreshSession();
      } else {
        session.lastActivity = Date.now();
      }
      saveToStorage();
    },

    /**
     * Check if the current session has timed out.
     * @returns {boolean}
     */
    isExpired() {
      return Date.now() - session.lastActivity > timeout;
    },

    /**
     * Force creation of a new session.
     */
    newSession() {
      session = createFreshSession();
      saveToStorage();
    },

    /**
     * Increment the page view counter.
     */
    incrementPageViews() {
      session.pageViews += 1;
      session.lastActivity = Date.now();
      saveToStorage();
    },
  };
}
