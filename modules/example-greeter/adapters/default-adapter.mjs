/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Default greeting adapter — provides a simple English greeting template.
 * @sidecar default-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx example-greeter
 * @public false
 * @edit careful
 */

/**
 * Default greeting adapter — returns a simple English template.
 *
 * @type {import('../ports/greeting-port.mjs').GreetingPort}
 */
export const defaultGreetingAdapter = {
  getTemplate() {
    return 'Hello, {name}!';
  },
};
