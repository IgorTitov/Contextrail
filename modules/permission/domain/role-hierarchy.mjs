/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Role Hierarchy domain logic for the permission module.
 * @sidecar role-hierarchy.mjs.header.md
 * @layer module | @hex domain | @ctx permission
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for role hierarchy resolution.
 * Framework-free, no external dependencies.
 */

/**
 * Create a role hierarchy resolver from a config map.
 *
 * @param {import('../ports/permission-port.mjs').RoleHierarchyConfig} config
 *   Maps each role to the parent roles it inherits from.
 *   Example: { admin: ['editor'], editor: ['viewer'] }
 * @returns {{ resolveRoles: (role: string) => string[] }}
 */
export function createRoleHierarchy(config) {
  return {
    /**
     * Returns the flattened set of effective roles for the given role,
     * including all inherited ancestors. Handles circular inheritance
     * gracefully via a visited set.
     *
     * @param {string} role
     * @returns {string[]}
     */
    resolveRoles(role) {
      /** @type {Set<string>} */
      const visited = new Set();
      /** @type {string[]} */
      const queue = [role];

      while (queue.length > 0) {
        const current = /** @type {string} */ (queue.shift());
        if (visited.has(current)) continue;
        visited.add(current);
        const parents = config[current];
        if (Array.isArray(parents)) {
          for (const parent of parents) {
            if (!visited.has(parent)) {
              queue.push(parent);
            }
          }
        }
      }

      return [...visited];
    },
  };
}
