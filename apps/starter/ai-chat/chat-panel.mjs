/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Render a framework-free chat panel DOM component that wires to any AiChatPort-conformant adapter via dependency injection and uses bounded selectors and i18n copy.
 * @sidecar chat-panel.mjs.header.md
 * @layer app | @hex _none_ | @ctx ai-chat
 * @public true
 * @edit careful
 */

/**
 * Framework-free chat panel component.
 * Connects to any AiChatPort-conformant adapter via dependency injection.
 *
 * SpecRefs: TPL-077
 */

import { t } from './messages.mjs';
import { aiChat } from './ui-selectors.mjs';

/**
 * Create a chat panel DOM element wired to an AI chat adapter.
 *
 * @param {object} options
 * @param {import('../../../modules/ai-chat/public-api.mjs').AiChatPort} options.adapter
 * @param {() => void} [options.onDestroy] - Called on cleanup
 * @returns {{ element: HTMLElement, destroy: () => void }}
 */
export function createChatPanel({ adapter, onDestroy }) {
  const panel = document.createElement('div');
  panel.className = 'ai-chat-panel';
  panel.setAttribute('data-testid', aiChat.panel);

  // Message list
  const messageList = document.createElement('div');
  messageList.className = 'ai-chat-message-list';
  messageList.setAttribute('data-testid', aiChat.messageList);
  messageList.setAttribute('role', 'log');
  messageList.setAttribute('aria-live', 'polite');
  panel.appendChild(messageList);

  // Empty state
  const emptyState = document.createElement('div');
  emptyState.className = 'ai-chat-empty';
  emptyState.textContent = t('ai-chat.ui.empty');
  messageList.appendChild(emptyState);

  // Typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-chat-typing';
  typingIndicator.setAttribute('data-testid', aiChat.typingIndicator);
  typingIndicator.textContent = t('ai-chat.ui.thinking');
  typingIndicator.hidden = true;
  panel.appendChild(typingIndicator);

  // Input area
  const inputArea = document.createElement('div');
  inputArea.className = 'ai-chat-input-area';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ai-chat-input';
  input.setAttribute('data-testid', aiChat.input);
  input.placeholder = t('ai-chat.ui.placeholder');
  input.setAttribute('aria-label', t('ai-chat.ui.placeholder'));
  inputArea.appendChild(input);

  const sendButton = document.createElement('button');
  sendButton.type = 'button';
  sendButton.className = 'ai-chat-send';
  sendButton.setAttribute('data-testid', aiChat.sendButton);
  sendButton.textContent = t('ai-chat.ui.send');
  inputArea.appendChild(sendButton);

  panel.appendChild(inputArea);

  let isSending = false;

  /**
   * Render a single message bubble.
   * @param {import('../../../modules/ai-chat/public-api.mjs').AiChatMessage} msg
   */
  function renderMessage(msg) {
    // Remove empty state on first message
    if (emptyState.parentNode) {
      emptyState.remove();
    }

    const bubble = document.createElement('div');
    bubble.className = `ai-chat-message ai-chat-message--${msg.role}`;
    bubble.setAttribute('data-testid', aiChat.messagePrefix + msg.id);
    bubble.textContent = msg.content;
    messageList.appendChild(bubble);
    messageList.scrollTop = messageList.scrollHeight;
  }

  /**
   * Handle sending a message.
   */
  async function handleSend() {
    const text = input.value.trim();
    if (!text || isSending) return;

    isSending = true;
    input.value = '';
    sendButton.disabled = true;
    typingIndicator.hidden = false;

    try {
      await adapter.sendMessage(text);
    } catch {
      // Error is visible via the adapter's own error handling
    } finally {
      isSending = false;
      sendButton.disabled = false;
      typingIndicator.hidden = true;
    }
  }

  // Wire events
  sendButton.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Listen for new messages from the adapter
  /** @param {import('../../../modules/ai-chat/public-api.mjs').AiChatMessage} msg */
  function onNewMessage(msg) {
    renderMessage(msg);
  }
  adapter.onMessage(onNewMessage);

  // Render existing history
  const existingHistory = adapter.getHistory();
  if (existingHistory.length > 0) {
    emptyState.remove();
    for (const msg of existingHistory) {
      renderMessage(msg);
    }
  }

  function destroy() {
    adapter.offMessage(onNewMessage);
    if (onDestroy) onDestroy();
  }

  return { element: panel, destroy };
}
