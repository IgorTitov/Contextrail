/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Provide the bounded data-testid and DOM selector registry for the AI chat feature so templates, JS, and tests share a single authoritative source of UI hook strings.
 * @sidecar ui-selectors.mjs.header.md
 * @layer app | @hex _none_ | @ctx ai-chat
 * @public true
 * @edit careful
 */

/**
 * Bounded selector registry for the AI chat feature.
 *
 * Usage:
 *   import { aiChat } from '../ai-chat/ui-selectors.mjs';
 *   page.getByTestId(aiChat.panel);
 *
 * SpecRefs: TPL-077
 */

export const aiChat = {
  /** data-testid for the chat panel container */
  panel: 'ai-chat-panel',

  /** data-testid for the message list area */
  messageList: 'ai-chat-message-list',

  /** data-testid for the text input */
  input: 'ai-chat-input',

  /** data-testid for the send button */
  sendButton: 'ai-chat-send',

  /** data-testid for the typing indicator */
  typingIndicator: 'ai-chat-typing',

  /** data-testid prefix for individual messages (appended with message id) */
  messagePrefix: 'ai-chat-msg-',
};
