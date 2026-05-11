/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Job-queue demo routes: enqueue a demo job, list jobs, run the worker.
 * @sidecar jobs.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * Job-queue demo routes — show how a host app drives the job-queue module.
 *
 * GET /api/jobs/enqueue?name=email&to=alice  → enqueue a demo job, return its id
 * GET /api/jobs                              → snapshot of current jobs
 * GET /api/jobs/run                          → drain the worker once, return count
 *
 * The handlers operate on `ctx.jobQueue` and `ctx.jobWorker`, both wired in
 * `createAppContext`. No real side effects — the demo handler just logs via
 * the log module so the flow stays framework-free and deterministic.
 */

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export function enqueueJobHandler(req, ctx) {
  const name = req.query.get('name') || 'demo';
  const payload = Object.fromEntries(req.query.entries());
  const job = ctx.jobQueue.enqueue(name, payload, { maxAttempts: 3 });
  ctx.log.info('Job enqueued', { id: job.id, name: job.name });
  return { id: job.id, name: job.name, status: job.status };
}

/** @param {{ query: URLSearchParams }} req @param {object} ctx */
export function listJobsHandler(req, ctx) {
  const statusFilter = req.query.get('status') || undefined;
  const jobs = ctx.jobQueue.list(statusFilter);
  return {
    total: jobs.length,
    jobs: jobs.map((j) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      lastError: j.lastError,
    })),
  };
}

/** @param {{ query: URLSearchParams }} _req @param {object} ctx */
export async function runJobsHandler(_req, ctx) {
  const processed = await ctx.jobWorker.runUntilEmpty();
  return { processed };
}
