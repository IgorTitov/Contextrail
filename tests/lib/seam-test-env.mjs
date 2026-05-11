/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Test helper that reads SEAM_STATE env var and configures seam adapters accordingly.
 * @sidecar seam-test-env.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Seam test environment helper.
 *
 * When SEAM_STATE=all-disabled, forces all seams to disabled state after registration.
 * When SEAM_STATE=all-active, forces all seams to active state after registration.
 * When absent, no-op — tests use whatever state they register.
 *
 * Usage in tests:
 *   import { applySeamTestEnv } from '../lib/seam-test-env.mjs';
 *   const adapter = createMemorySeamAdapter();
 *   applySeamTestEnv(adapter); // patches adapter based on SEAM_STATE
 *
 * Usage from CLI:
 *   SEAM_STATE=all-active pnpm test:unit
 */

const SEAM_STATE = process.env.SEAM_STATE;

/**
 * Apply SEAM_STATE override to an adapter.
 * Wraps register() to force state after registration.
 *
 * @param {import('../../modules/feature-seams/ports/seam-port.mjs').SeamPort} adapter
 */
export function applySeamTestEnv(adapter) {
  if (!SEAM_STATE || SEAM_STATE === 'default') return;

  const originalRegister = adapter.register.bind(adapter);
  adapter.register = (flag, config) => {
    originalRegister(flag, config);
    if (SEAM_STATE === 'all-disabled') {
      adapter.disable(flag);
    } else if (SEAM_STATE === 'all-active') {
      adapter.enable(flag);
    }
  };
}

/**
 * @returns {string | undefined} Current SEAM_STATE value
 */
export function getSeamTestState() {
  return SEAM_STATE;
}
