/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the optional contract-first seam example exists, is importable, and exports the expected pattern surface.
 * @sidecar contract-seam-pattern-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('contract-seam example module exists and exports the expected pattern surface', async () => {
  const modPath = new URL(
    '../../apps/starter/examples/contract-seam/notifications_contract.mjs',
    import.meta.url,
  );
  assert.ok(existsSync(modPath), 'notifications_contract.mjs must exist');

  const mod = await import(modPath);
  assert.equal(typeof mod._setImpl, 'function', '_setImpl must be exported');
  assert.equal(typeof mod._resetImpl, 'function', '_resetImpl must be exported');
  assert.equal(typeof mod.notify, 'function', 'notify must be exported');
});

test('contract-seam example has a README documenting the pattern', () => {
  const readmePath = new URL(
    '../../apps/starter/examples/contract-seam/README.md',
    import.meta.url,
  );
  assert.ok(existsSync(readmePath), 'contract-seam README.md must exist');
});
