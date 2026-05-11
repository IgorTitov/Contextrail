/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Node crypto primitives wired to the pure oauth-flow domain (randomBytes + sha256).
 * @sidecar node-oauth-crypto.mjs.header.md
 * @layer module | @hex adapter | @ctx auth
 * @public true
 * @edit careful
 */

import { randomBytes as nodeRandomBytes, createHash } from 'node:crypto';
import { generatePkcePair, generateOAuthState } from '../domain/oauth-flow.mjs';

/** @type {import('../domain/oauth-flow.mjs').RandomBytesFn} */
export function nodeRandomBytesFn(size) {
  return new Uint8Array(nodeRandomBytes(size));
}

/** @type {import('../domain/oauth-flow.mjs').Sha256Fn} */
export function nodeSha256Fn(input) {
  const hash = createHash('sha256');
  hash.update(input);
  return new Uint8Array(hash.digest());
}

/** @returns {import('../domain/oauth-flow.mjs').PkcePair} */
export function createNodePkcePair() {
  return generatePkcePair(nodeRandomBytesFn, nodeSha256Fn);
}

/** @returns {string} */
export function createNodeOAuthState() {
  return generateOAuthState(nodeRandomBytesFn);
}
