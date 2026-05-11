/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide all user-facing i18n copy for the auth module, keyed by locale, so auth adapters never embed raw strings directly.
 * @sidecar messages.mjs.header.md
 * @layer module | @hex _none_ | @ctx auth
 * @public true
 * @edit careful
 */

/**
 * Bounded i18n messages for the auth module.
 * All user-facing copy from auth adapters flows through this layer.
 *
 * SpecRefs: TPL-062
 */

const locales = {
  en: {
    'auth.login.missing_credentials': 'Username and password are required.',
    'auth.login.invalid_credentials': 'Invalid username or password.',
    'auth.register.missing_fields': 'Username and password are required.',
    'auth.register.user_exists': 'A user with this username already exists.',
    'auth.guard.not_authenticated': 'You must be logged in to access this page.',
    'auth.guard.insufficient_role': 'You do not have permission to access this page.',
    'auth.jwt.verification_failed': 'Token verification failed. Please log in again.',
    'auth.jwt.token_expired': 'Your session has expired. Please log in again.',
    'auth.jwt.refresh_unavailable': 'Session refresh is not available. Please log in again.',
    'auth.jwt.refresh_failed': 'Session refresh failed. Please log in again.',
    'auth.oauth.port.not_object': 'OAuthProviderPort adapter must be a non-null object.',
    'auth.oauth.port.missing_provider_name':
      'OAuthProviderPort adapter must expose a non-empty providerName.',
    'auth.oauth.port.missing_build_authorization_url':
      'OAuthProviderPort adapter must implement buildAuthorizationUrl().',
    'auth.oauth.port.missing_exchange_code':
      'OAuthProviderPort adapter must implement exchangeCode().',
    'auth.oauth.port.missing_fetch_user_info':
      'OAuthProviderPort adapter must implement fetchUserInfo().',
    'auth.oauth.flow.invalid_primitives':
      'OAuth flow primitives (randomBytes, sha256) must be functions.',
    'auth.oauth.flow.invalid_authorize_input': 'Authorize URL input must be a non-null object.',
    'auth.oauth.flow.invalid_endpoint': 'OAuth endpoint must be a non-empty string.',
    'auth.oauth.flow.invalid_client_id': 'OAuth clientId must be a non-empty string.',
    'auth.oauth.flow.invalid_redirect_uri': 'OAuth redirectUri must be a non-empty string.',
    'auth.oauth.flow.invalid_state': 'OAuth state must be a non-empty string.',
    'auth.oauth.flow.invalid_code_challenge': 'OAuth codeChallenge must be a non-empty string.',
    'auth.oauth.flow.invalid_profile': 'OAuth provider profile is missing required fields.',
    'auth.oauth.config.invalid': 'OAuth provider config must be a non-null object.',
    'auth.oauth.config.missing_client_id': 'OAuth provider config is missing clientId.',
    'auth.oauth.config.missing_client_secret': 'OAuth provider config is missing clientSecret.',
    'auth.oauth.config.missing_fetch': 'OAuth provider config is missing a fetch implementation.',
    'auth.oauth.exchange.invalid_params':
      'OAuth token exchange parameters must be a non-null object.',
    'auth.oauth.exchange.missing_code': 'OAuth token exchange is missing an authorization code.',
    'auth.oauth.exchange.failed': 'OAuth token exchange failed.',
    'auth.oauth.userinfo.invalid_tokens':
      'OAuth user info fetch requires a token bundle with an accessToken.',
    'auth.oauth.userinfo.failed': 'OAuth user info fetch failed.',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  currentLocale = locale;
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key];
  if (template == null) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

/**
 * @param {string} locale
 * @param {Record<string, string>} messages
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
