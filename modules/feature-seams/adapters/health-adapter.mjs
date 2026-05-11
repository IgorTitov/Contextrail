/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Health check adapter that aggregates seam state from a SeamPort.
 * @sidecar health-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Create a health adapter that reads seam state and returns a health snapshot.
 * Downstream users wire this into their HTTP/K8s health endpoint.
 *
 * @param {import('../ports/seam-port.mjs').SeamPort} seamPort
 * @returns {import('../ports/health-port.mjs').HealthPort}
 */
export function createHealthAdapter(seamPort) {
  return {
    check() {
      const entries = seamPort.list();
      const now = new Date();
      const seams = entries.map((e) => ({
        flag: e.flag,
        state: e.state,
        enabledAt: e.enabledAt,
        disabledAt: e.disabledAt,
        cleanupBy: e.cleanupBy,
      }));

      // Unhealthy if any seam has overdue cleanup
      const hasOverdue = seams.some((s) => {
        if (!s.cleanupBy) return false;
        const deadline = new Date(s.cleanupBy);
        return !isNaN(deadline.getTime()) && deadline < now;
      });

      return {
        healthy: !hasOverdue,
        seams,
      };
    },
  };
}
