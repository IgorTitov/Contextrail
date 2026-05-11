/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Sequential prerender runner — walks a plan, invokes the render function per route, writes results through the output port.
 * @sidecar sequential-prerender-runner.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { planToTargets } from '../domain/prerender-plan.mjs';
import { createRenderResult } from '../domain/render-result.mjs';
import { assertRenderFunction } from '../ports/render-function-port.mjs';
import { assertStaticOutputPort } from '../ports/static-output-port.mjs';

/**
 * Sequential prerender runner. Iterates a frozen plan in order,
 * awaits the user-supplied render function for each route, wraps the
 * raw return value in a validated `RenderResult`, and writes the HTML
 * to the `StaticOutputPort`. Failures in one route do not abort the
 * whole run — they land in the `failed` array of the returned summary
 * with the path and the error message, and the runner moves on to the
 * next target.
 *
 * Sequential was chosen over parallel on purpose: the runner is the
 * reference primitive, and sequential output is (a) deterministic, (b)
 * easy to reason about from a limited context window, and (c) trivial
 * to wrap in a concurrent adapter later without touching the pure
 * domain.
 *
 * @param {{
 *   renderFn: import('../ports/render-function-port.mjs').RenderFunctionPort,
 *   output: import('../ports/static-output-port.mjs').StaticOutputPort,
 *   now?: () => number,
 * }} options
 */
export function createSequentialPrerenderRunner(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError(t('prerender.runner.missing_render_fn'));
  }
  const { renderFn, output } = options;
  if (typeof renderFn !== 'function') {
    throw new TypeError(t('prerender.runner.missing_render_fn'));
  }
  if (!output) {
    throw new TypeError(t('prerender.runner.missing_output'));
  }
  assertRenderFunction(renderFn);
  assertStaticOutputPort(output);

  const now = options.now ?? Date.now;

  return {
    /**
     * Execute the plan. Returns a summary of rendered + failed paths
     * plus the wall-clock duration in milliseconds.
     *
     * @param {Readonly<import('../domain/prerender-plan.mjs').PrerenderPlan>} plan
     */
    async run(plan) {
      if (!plan || typeof plan !== 'object' || !Object.isFrozen(plan)) {
        throw new TypeError(t('prerender.runner.invalid_plan'));
      }
      const targets = planToTargets(plan);
      const startedAt = now();

      /** @type {Array<{ path: string, status: number, size: number }>} */
      const rendered = [];
      /** @type {Array<{ path: string, error: string }>} */
      const failed = [];

      for (const target of targets) {
        try {
          const raw = await renderFn(target.path, {
            absoluteUrl: target.absoluteUrl,
          });
          if (!raw || typeof raw !== 'object') {
            throw new TypeError(t('prerender.result.invalid'));
          }
          const result = createRenderResult({
            path: target.path,
            html: /** @type {Record<string, unknown>} */ (raw).html,
            status: /** @type {Record<string, unknown>} */ (raw).status,
            headers: /** @type {Record<string, unknown>} */ (raw).headers,
          });
          const record = await output.write(result.path, result.html);
          rendered.push({
            path: result.path,
            status: result.status,
            size: record.size,
          });
        } catch (err) {
          failed.push({
            path: target.path,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const durationMs = Math.max(0, now() - startedAt);

      return Object.freeze({
        rendered: Object.freeze(rendered),
        failed: Object.freeze(failed),
        durationMs,
      });
    },
  };
}
