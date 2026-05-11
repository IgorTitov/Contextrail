/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Optional advanced example of the contract-first browser module seam pattern.
 * @sidecar notifications_contract.mjs.header.md
 * @layer apps | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * Contract-first browser module seam — notifications example.
 *
 * This facade defines the stable API. Callers import from here.
 * The real implementation is injected at runtime via _setImpl().
 *
 * Pattern:
 *   1. This contract file owns the public function signatures.
 *   2. App init wires the real implementation: _setImpl(domNotifier).
 *   3. Tests wire a test double: _setImpl(memoryNotifier).
 *   4. Callers never import the implementation directly.
 *
 * When to use:
 *   - Browser modules where the adapter is likely to churn.
 *   - Modules that need isolated testing without DOM or network.
 *
 * When NOT to use:
 *   - Simple, stable modules where direct imports are clear enough.
 *   - One-off helpers that will never need implementation swaps.
 */

let _impl = null;

/**
 * Wire the active implementation.
 * Call once during app init or at the top of each test.
 * @param {{ notify: (message: string, level?: string) => void }} impl
 */
export function _setImpl(impl) {
  _impl = impl;
}

/**
 * Reset to unwired state. Useful in test teardown.
 */
export function _resetImpl() {
  _impl = null;
}

/**
 * Show a notification to the user.
 * @param {string} message
 * @param {'info' | 'warn' | 'error'} [level='info']
 */
export function notify(message, level = 'info') {
  if (!_impl) {
    throw new Error('notifications contract: implementation not wired — call _setImpl() first');
  }
  return _impl.notify(message, level);
}
