/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Health route handler for the api-starter API.
 * @sidecar health.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * Health check route.
 * Returns server status and uptime.
 *
 * @param {object} _req — unused
 * @param {object} ctx — app context with wired adapters
 * @returns {{ status: string, uptime: number, mode: string }}
 */
export function healthHandler(_req, ctx) {
  return {
    status: 'ok',
    uptime: process.uptime(),
    mode: ctx.config.mode,
  };
}
