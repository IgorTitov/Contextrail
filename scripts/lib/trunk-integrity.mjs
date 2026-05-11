/* @HEADER
 * @version 0.7.74 | 2026-05-04
 * @purpose Pure helpers for R8.5 trunk-integrity enforcement — force-push detection via pre-push refspec ancestry analysis. No I/O.
 * @sidecar trunk-integrity.mjs.header.md
 * @layer lib | @hex domain | @ctx trunk-integrity
 * @public true
 * @edit careful
 */

/**
 * Trunk integrity library (R8.5 / TPL-259).
 *
 * Pure functions that classify whether a push to trunk constitutes a
 * force-push (i.e. the remote SHA is not an ancestor of the local SHA).
 *
 * Detection strategy:
 *   The pre-push hook receives stdin lines of the form:
 *     <local-ref> <local-sha> <remote-ref> <remote-sha>
 *   If the remote SHA exists (not all-zero) and is NOT an ancestor of
 *   the local SHA, the push would rewrite history — a force-push.
 *
 * Operator override:
 *   COA_OPERATOR=1 + COA_FORCE_TRUNK=1 allows a force-push; the
 *   caller (trunk-integrity-check.mjs) is responsible for audit-logging.
 *
 * No git invocations, no filesystem reads. Ancestry checks are passed
 * in by the caller who has the git context.
 *
 * @see docs/rules-registry.md#r85
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TRUNK_BRANCHES = Object.freeze(['main', 'master']);

/** Sentinel SHA meaning "no such ref on the remote". */
export const ZERO_SHA = '0000000000000000000000000000000000000000';

// ---------------------------------------------------------------------------
// parsePushRefspecs
// ---------------------------------------------------------------------------

/**
 * Parse the lines that git's pre-push hook receives on stdin.
 *
 * Each line has the shape:
 *   <local-ref> <local-sha> <remote-ref> <remote-sha>
 *
 * Returns an array of refspec objects. Malformed lines are silently
 * skipped so a single bad line never kills the hook.
 *
 * @param {string} stdin  Raw stdin content from the pre-push hook
 * @returns {Array<{localRef: string, localSha: string, remoteRef: string, remoteSha: string}>}
 */
export function parsePushRefspecs(stdin) {
  const result = [];
  for (const line of stdin.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 4) continue;
    const [localRef, localSha, remoteRef, remoteSha] = parts;
    if (!localRef || !localSha || !remoteRef || !remoteSha) continue;
    result.push({ localRef, localSha, remoteRef, remoteSha });
  }
  return result;
}

// ---------------------------------------------------------------------------
// isPushToTrunk
// ---------------------------------------------------------------------------

/**
 * Return true when the refspec targets a trunk branch.
 *
 * Accepts both full refs (refs/heads/main) and short names (main).
 *
 * @param {{ remoteRef: string }} refspec
 * @param {readonly string[]} [trunkBranches]
 * @returns {boolean}
 */
export function isPushToTrunk(refspec, trunkBranches = TRUNK_BRANCHES) {
  const ref = refspec.remoteRef || '';
  const short = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref;
  return trunkBranches.includes(short);
}

// ---------------------------------------------------------------------------
// isForcePush
// ---------------------------------------------------------------------------

/**
 * Classify a single refspec as a force-push based on ancestry.
 *
 * A push is a force-push when the remote already has a commit (remoteSha
 * is not ZERO_SHA) AND the remote SHA is NOT an ancestor of the local SHA.
 * The ancestry result is supplied by the caller (boolean).
 *
 * @param {object} opts
 * @param {{ localSha: string, remoteSha: string }} opts.refspec
 * @param {boolean}  opts.remoteIsAncestor  true when `git merge-base --is-ancestor remoteSha localSha` returns 0
 * @returns {boolean}
 */
export function isForcePush({ refspec, remoteIsAncestor }) {
  if (refspec.localSha === ZERO_SHA) return false; // deletion push — not force
  if (refspec.remoteSha === ZERO_SHA) return false; // first push to new branch
  return !remoteIsAncestor;
}

// ---------------------------------------------------------------------------
// classifyPush
// ---------------------------------------------------------------------------

/**
 * Top-level classifier: given all trunk-bound refspecs and their ancestry
 * results, decide whether the push is allowed.
 *
 * Returns `{ allowed: true }` or `{ allowed: false, deniedReason: string }`.
 *
 * Operator override: if `env.COA_OPERATOR === '1'` AND
 * `env.COA_FORCE_TRUNK === '1'`, force-pushes are allowed (audited by
 * the caller).
 *
 * @param {object} opts
 * @param {Array<{ refspec: object, remoteIsAncestor: boolean }>} opts.trunkRefspecs
 *   Only the trunk-bound refspecs should be passed here.
 * @param {{ COA_OPERATOR?: string, COA_FORCE_TRUNK?: string }} opts.env
 * @returns {{ allowed: boolean, deniedReason?: string, forcePushRefspecs?: object[] }}
 */
export function classifyPush({ trunkRefspecs, env = {} }) {
  const forced = trunkRefspecs.filter(({ refspec, remoteIsAncestor }) =>
    isForcePush({ refspec, remoteIsAncestor }),
  );

  if (forced.length === 0) {
    return { allowed: true };
  }

  const operatorOverride = env.COA_OPERATOR === '1' && env.COA_FORCE_TRUNK === '1';

  if (operatorOverride) {
    return {
      allowed: true,
      operatorOverride: true,
      forcePushRefspecs: forced.map((f) => f.refspec),
    };
  }

  const refs = forced.map((f) => f.refspec.remoteRef).join(', ');
  return {
    allowed: false,
    deniedReason: `force-push to trunk detected (${refs}) — use COA_OPERATOR=1 COA_FORCE_TRUNK=1 to override (audited)`,
    forcePushRefspecs: forced.map((f) => f.refspec),
  };
}
