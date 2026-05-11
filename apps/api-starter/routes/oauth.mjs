/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose OAuth 2.0 start and callback handlers for api-starter — uses an in-memory pending-state store plus the injected OAuthProviderPort.
 * @sidecar oauth.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * OAuth demo routes.
 *
 * `/auth/oauth/start` builds an authorization URL with PKCE + state and
 * records the verifier keyed by state. `/auth/oauth/callback` looks the
 * verifier up, exchanges the code for tokens, fetches the user profile,
 * and returns it as JSON. Intentionally does NOT issue a real session
 * cookie — the starter leaves session minting to the app that embeds it.
 */

/**
 * Create an in-memory map to hold pending OAuth state between start and
 * callback. Exported as a factory so tests can inject one and introspect it.
 *
 * @returns {Map<string, { codeVerifier: string, redirectUri: string, createdAt: number }>}
 */
export function createPendingOAuthStore() {
  return new Map();
}

/**
 * Build the OAuth start handler.
 *
 * @param {{
 *   provider: import('../../../modules/auth/public-api.mjs').assertOAuthProviderPort extends infer _ ? any : never,
 *   pkceFactory: () => import('../../../modules/auth/public-api.mjs').PkcePair | { codeVerifier: string, codeChallenge: string },
 *   stateFactory: () => string,
 *   store: Map<string, { codeVerifier: string, redirectUri: string, createdAt: number }>,
 *   redirectUri: string,
 *   now?: () => number,
 * }} deps
 */
export function createOAuthStartHandler(deps) {
  const now = deps.now ?? (() => Date.now());
  /**
   * @param {{ query: URLSearchParams, method: string, pathname: string }} _req
   */
  return async function oauthStartHandler(_req) {
    const pkce = deps.pkceFactory();
    const state = deps.stateFactory();
    deps.store.set(state, {
      codeVerifier: pkce.codeVerifier,
      redirectUri: deps.redirectUri,
      createdAt: now(),
    });
    const authorizationUrl = deps.provider.buildAuthorizationUrl({
      redirectUri: deps.redirectUri,
      state,
      codeChallenge: pkce.codeChallenge,
    });
    return {
      provider: deps.provider.providerName,
      authorizationUrl,
      state,
    };
  };
}

/**
 * Build the OAuth callback handler.
 *
 * @param {{
 *   provider: any,
 *   store: Map<string, { codeVerifier: string, redirectUri: string, createdAt: number }>,
 * }} deps
 */
export function createOAuthCallbackHandler(deps) {
  /**
   * @param {{ query: URLSearchParams, method: string, pathname: string }} req
   */
  return async function oauthCallbackHandler(req) {
    const code = req.query.get('code');
    const state = req.query.get('state');
    if (typeof code !== 'string' || typeof state !== 'string') {
      throw new Error('oauth.callback.missing_code_or_state');
    }
    const pending = deps.store.get(state);
    if (!pending) {
      throw new Error('oauth.callback.unknown_state');
    }
    deps.store.delete(state);
    const tokens = await deps.provider.exchangeCode({
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri: pending.redirectUri,
    });
    const user = await deps.provider.fetchUserInfo(tokens);
    return {
      provider: deps.provider.providerName,
      user: { id: user.id, displayName: user.displayName, role: user.role },
    };
  };
}
