/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Wire the AI chat feature into a starter app container, defaulting to the echo adapter and supporting adapter injection for seam-based swap to a real backend.
 * @sidecar ai-chat-init.mjs.header.md
 * @layer app | @hex _none_ | @ctx ai-chat
 * @public true
 * @edit careful
 */

/**
 * AI Chat initialization for the starter app.
 * Wires the chat panel with the echo adapter by default,
 * and demonstrates adapter swap via the feature-seams mechanism.
 *
 * SpecRefs: TPL-078
 */

import { createEchoAdapter } from '../../../modules/ai-chat/public-api.mjs';
import { createChatPanel } from './chat-panel.mjs';

/**
 * Initialize the AI Chat feature inside a container element.
 *
 * @param {HTMLElement} container — the element to mount the chat panel into
 * @param {object} [options]
 * @param {import('../../../modules/ai-chat/public-api.mjs').AiChatPort} [options.adapter] — custom adapter override (default: echo)
 * @param {import('../../../modules/auth/public-api.mjs').AuthPort} [options.authAdapter] — optional auth adapter for user context
 * @param {string} [options.systemPrompt] — optional system prompt
 * @returns {{ destroy: () => void }}
 */
export function initAiChat(container, options = {}) {
  // Use provided adapter or default to echo
  const adapter = options.adapter || createEchoAdapter();

  const { element, destroy: destroyPanel } = createChatPanel({
    adapter,
    onDestroy: () => {},
  });

  container.appendChild(element);

  return {
    destroy() {
      destroyPanel();
      element.remove();
    },
  };
}
