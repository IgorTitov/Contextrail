/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure domain logic for onboarding checklists — task definitions, progress tracking, conditional visibility.
 * @sidecar checklist.mjs.header.md
 * @layer module | @hex domain | @ctx onboarding
 * @public false
 * @edit careful
 */

/**
 * Onboarding checklist: a list of tasks the user should complete.
 * Pure domain logic — no storage, no UI.
 *
 * Works alongside tour steps: tours are guided walkthroughs,
 * checklists are self-paced task lists.
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {string} id - unique key (e.g., 'create-first-project')
 * @property {string} title - display title
 * @property {string} [description] - optional detail
 * @property {number} order - sort order
 * @property {string} [requiredBefore] - id of item that must be done first
 * @property {string} [group] - group label (e.g., 'Getting started', 'Advanced')
 */

/**
 * @typedef {Object} ChecklistProgress
 * @property {Set<string>} completed - set of completed item IDs
 * @property {string} [dismissedAt] - ISO date when user dismissed the checklist
 */

/**
 * @typedef {Object} ChecklistState
 * @property {ChecklistItem[]} items
 * @property {ChecklistProgress} progress
 */

/**
 * Create initial checklist state.
 * @param {ChecklistItem[]} items
 * @param {string[]} [alreadyCompleted] - pre-completed item IDs (from storage)
 * @returns {ChecklistState}
 */
export function createChecklistState(items, alreadyCompleted = []) {
  return {
    items: [...items].sort((a, b) => a.order - b.order),
    progress: {
      completed: new Set(alreadyCompleted),
      dismissedAt: undefined,
    },
  };
}

/**
 * Mark an item as completed.
 * @param {ChecklistState} state
 * @param {string} itemId
 * @returns {ChecklistState}
 */
export function completeItem(state, itemId) {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;
  const completed = new Set(state.progress.completed);
  completed.add(itemId);
  return { ...state, progress: { ...state.progress, completed } };
}

/**
 * Uncomplete an item (undo).
 * @param {ChecklistState} state
 * @param {string} itemId
 * @returns {ChecklistState}
 */
export function uncompleteItem(state, itemId) {
  const completed = new Set(state.progress.completed);
  completed.delete(itemId);
  return { ...state, progress: { ...state.progress, completed } };
}

/**
 * Dismiss the checklist ("don't show again").
 * @param {ChecklistState} state
 * @returns {ChecklistState}
 */
export function dismissChecklist(state) {
  return {
    ...state,
    progress: { ...state.progress, dismissedAt: new Date().toISOString() },
  };
}

/**
 * Check if an item is available (prerequisites met).
 * @param {ChecklistState} state
 * @param {string} itemId
 * @returns {boolean}
 */
export function isItemAvailable(state, itemId) {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return false;
  if (!item.requiredBefore) return true;
  return state.progress.completed.has(item.requiredBefore);
}

/**
 * Get completion percentage (0-100).
 * @param {ChecklistState} state
 * @returns {number}
 */
export function getCompletionPercent(state) {
  if (state.items.length === 0) return 100;
  return Math.round((state.progress.completed.size / state.items.length) * 100);
}

/**
 * Get items grouped by their group label.
 * @param {ChecklistState} state
 * @returns {Map<string, ChecklistItem[]>}
 */
export function getGroupedItems(state) {
  const groups = new Map();
  for (const item of state.items) {
    const group = item.group || 'default';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  }
  return groups;
}

/**
 * Get the next incomplete, available item.
 * @param {ChecklistState} state
 * @returns {ChecklistItem | null}
 */
export function getNextItem(state) {
  for (const item of state.items) {
    if (state.progress.completed.has(item.id)) continue;
    if (!isItemAvailable(state, item.id)) continue;
    return item;
  }
  return null;
}

/**
 * Check if all items are completed.
 * @param {ChecklistState} state
 * @returns {boolean}
 */
export function isAllComplete(state) {
  return state.items.length > 0 && state.progress.completed.size >= state.items.length;
}

/**
 * Serialize progress for storage (Set → Array).
 * @param {ChecklistProgress} progress
 * @returns {{ completed: string[], dismissedAt?: string }}
 */
export function serializeProgress(progress) {
  return {
    completed: [...progress.completed],
    dismissedAt: progress.dismissedAt,
  };
}

/**
 * Deserialize progress from storage (Array → Set).
 * @param {{ completed: string[], dismissedAt?: string }} data
 * @returns {ChecklistProgress}
 */
export function deserializeProgress(data) {
  return {
    completed: new Set(data.completed || []),
    dismissedAt: data.dismissedAt,
  };
}
