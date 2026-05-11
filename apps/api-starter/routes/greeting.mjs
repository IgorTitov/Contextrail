/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Greeting route handler for the api-starter API.
 * @sidecar greeting.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * Greeting route — demonstrates hex module usage from the server app shell.
 * Uses the cache and log modules wired by the app context.
 *
 * GET  /api/greet?name=Alice → { message: "Hello, Alice!" }
 *
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx — app context with wired adapters
 * @returns {{ message: string, cached: boolean }}
 */
export function greetHandler(req, ctx) {
  const name = req.query.get('name') || 'World';
  const cacheKey = `greet:${name}`;

  // Check cache first
  const cached = ctx.cache.get(cacheKey);
  if (cached) {
    ctx.log.debug('Cache hit', { name });
    return { message: cached, cached: true };
  }

  const message = `Hello, ${name}!`;
  ctx.cache.set(cacheKey, message, { ttl: 30000 });
  ctx.log.info('Greeting generated', { name });

  return { message, cached: false };
}
