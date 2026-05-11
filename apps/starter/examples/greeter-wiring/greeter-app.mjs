/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Show how an application wires and uses a bounded-context module through its public API.
 * @sidecar greeter-app.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

import {
  greet,
  assertGreetingPort,
  defaultGreetingAdapter,
} from '../../../../modules/example-greeter/public-api.mjs';

/**
 * Wire a greeting adapter and return a ready-to-call greeter function.
 *
 * This demonstrates the canonical application-layer pattern:
 * 1. Choose an adapter (default or custom).
 * 2. Validate it against the port contract at startup.
 * 3. Return a simple function that the UI or CLI layer can call.
 *
 * @param {object} [adapter] A GreetingPort-compatible adapter. Defaults to the built-in adapter.
 * @returns {(name: string) => string} A function that greets the given name.
 */
export function createGreeter(adapter = defaultGreetingAdapter) {
  assertGreetingPort(adapter);
  const template = adapter.getTemplate();
  return (name) => greet(name, template);
}
