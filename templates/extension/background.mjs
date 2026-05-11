/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Chrome extension Manifest V3 background service worker scaffold with install listener and ping/pong message handler.
 * @sidecar background.mjs.header.md
 * @layer templates | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Chrome extension background service worker.
 *
 * This is a minimal scaffold. Add message listeners, alarm handlers,
 * or context menu setup here as your extension grows.
 *
 * The extension popup loads the starter app UI from popup.html.
 * Background tasks communicate with the popup via chrome.runtime messaging.
 *
 * SpecRefs: TPL-033
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[extension] Installed');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ping') {
    sendResponse({ type: 'pong' });
  }
});
