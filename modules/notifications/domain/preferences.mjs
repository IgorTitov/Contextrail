/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure domain logic for notification preferences — per-event-type channel routing.
 * @sidecar preferences.mjs.header.md
 * @layer module | @hex domain | @ctx notifications
 * @public false
 * @edit careful
 */

/**
 * Notification preferences: user chooses which channel receives each
 * event type. Pure domain logic — no storage, no framework.
 */

/**
 * @typedef {'in-app' | 'email' | 'push' | 'none'} NotificationChannel
 */

/**
 * @typedef {Object} ChannelPreference
 * @property {NotificationChannel} channel
 * @property {boolean} [muted] - temporarily mute without changing preference
 */

/**
 * @typedef {Record<string, ChannelPreference>} NotificationPreferences
 * Keys are event type IDs (e.g., 'task-assigned', 'comment-reply', 'system-alert').
 */

/** Default channel when no preference is set. */
const DEFAULT_CHANNEL = /** @type {NotificationChannel} */ ('in-app');

/**
 * Create default preferences for a set of event types.
 * @param {string[]} eventTypes
 * @param {NotificationChannel} [defaultChannel]
 * @returns {NotificationPreferences}
 */
export function createDefaultPreferences(eventTypes, defaultChannel = DEFAULT_CHANNEL) {
  /** @type {NotificationPreferences} */
  const prefs = {};
  for (const type of eventTypes) {
    prefs[type] = { channel: defaultChannel, muted: false };
  }
  return prefs;
}

/**
 * Update a single event type's channel preference.
 * @param {NotificationPreferences} prefs
 * @param {string} eventType
 * @param {NotificationChannel} channel
 * @returns {NotificationPreferences}
 */
export function setChannelPreference(prefs, eventType, channel) {
  return { ...prefs, [eventType]: { ...prefs[eventType], channel } };
}

/**
 * Mute/unmute a specific event type.
 * @param {NotificationPreferences} prefs
 * @param {string} eventType
 * @param {boolean} muted
 * @returns {NotificationPreferences}
 */
export function setMuted(prefs, eventType, muted) {
  return { ...prefs, [eventType]: { ...prefs[eventType], muted } };
}

/**
 * Resolve which channel should receive a notification for a given event type.
 * Returns 'none' if muted or explicitly set to none.
 * @param {NotificationPreferences} prefs
 * @param {string} eventType
 * @returns {NotificationChannel}
 */
export function resolveChannel(prefs, eventType) {
  const pref = prefs[eventType];
  if (!pref) return DEFAULT_CHANNEL;
  if (pref.muted) return 'none';
  return pref.channel;
}

/**
 * Bulk mute all event types (e.g., "Do Not Disturb" mode).
 * @param {NotificationPreferences} prefs
 * @returns {NotificationPreferences}
 */
export function muteAll(prefs) {
  /** @type {NotificationPreferences} */
  const result = {};
  for (const [key, val] of Object.entries(prefs)) {
    result[key] = { ...val, muted: true };
  }
  return result;
}

/**
 * Bulk unmute all event types.
 * @param {NotificationPreferences} prefs
 * @returns {NotificationPreferences}
 */
export function unmuteAll(prefs) {
  /** @type {NotificationPreferences} */
  const result = {};
  for (const [key, val] of Object.entries(prefs)) {
    result[key] = { ...val, muted: false };
  }
  return result;
}
