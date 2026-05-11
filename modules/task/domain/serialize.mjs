/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Serialize domain logic for the task module.
 * @sidecar serialize.mjs.header.md
 * @layer module | @hex domain | @ctx task
 * @public false
 * @edit careful
 */

/**
 * Serialization helpers for transferring data to Worker threads.
 */

import { t } from '../messages.mjs';

/**
 * Known transferable type names for environments where the global
 * constructors may not be available (e.g. Node.js without Web APIs).
 */
const TRANSFERABLE_TYPE_NAMES = new Set([
  'ArrayBuffer',
  'MessagePort',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'ImageBitmap',
  'OffscreenCanvas',
]);

/**
 * Check whether a value is a recognized transferable type.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isTransferable(value) {
  if (value == null || typeof value !== 'object') return false;
  const name = value.constructor?.name;
  return TRANSFERABLE_TYPE_NAMES.has(name);
}

/**
 * Prepare data for Worker postMessage, validating any transferables.
 *
 * @param {*} data
 * @param {Transferable[]} [transferables]
 * @returns {{ data: *, transferables: Transferable[] }}
 */
export function serializeForTransfer(data, transferables = []) {
  for (let i = 0; i < transferables.length; i++) {
    if (!isTransferable(transferables[i])) {
      throw new TypeError(t('task.serialize.invalid_transferable', { index: i }));
    }
  }

  return {
    data: structuredClone(data),
    transferables: [...transferables],
  };
}
