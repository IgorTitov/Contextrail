/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Echo Adapter.D adapter for the ai-chat module.
 * @sidecar echo-adapter.d.ts.header.md
 * @layer module | @hex adapter | @ctx ai-chat
 * @public false
 * @edit careful
 */

/**
 * Type definitions for the echo adapter.
 *
 * SpecRefs: TPL-073
 */

import type { AiChatPort } from '../types.js';

export function createEchoAdapter(options?: {
  delay?: number;
  maxMessages?: number;
}): AiChatPort;
