/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Email demo route: validate + enqueue an outbound message through the job queue.
 * @sidecar email.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * Email demo route — shows how a host app drives the email module behind the
 * job-queue port. The HTTP handler validates the message through the email
 * domain, then enqueues a `send-email` job. A separate worker tick (either
 * /api/jobs/run or a host-driven setInterval) actually delivers the message
 * through `ctx.mailer`.
 *
 * GET /api/email/send?to=alice@example.com&subject=hi&text=hello  → enqueued job id
 * GET /api/email/list                                             → snapshot of sent messages
 */

import { createEmailMessage } from '../../../modules/email/public-api.mjs';

/**
 * Build the outbound message from query parameters. Kept small and explicit —
 * the demo only surfaces the three minimum fields a starter app usually needs.
 *
 * @param {URLSearchParams} query
 * @param {string} defaultFrom
 */
function buildMessageInput(query, defaultFrom) {
  return {
    from: query.get('from') || defaultFrom,
    to: query.get('to') || 'demo@example.com',
    subject: query.get('subject') || 'Hello from api-starter',
    text: query.get('text') || 'This is a demo message from the api-starter template.',
  };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export function sendEmailHandler(req, ctx) {
  const input = buildMessageInput(req.query, ctx.emailFrom);
  // Validate early so the HTTP caller gets a 500 + TypeError at the boundary
  // rather than a silently-dead job on the worker side.
  createEmailMessage(input);
  const job = ctx.jobQueue.enqueue('send-email', input, { maxAttempts: 3 });
  ctx.log.info('Email enqueued', { id: job.id, to: input.to });
  return { id: job.id, status: job.status, to: input.to, subject: input.subject };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export function listEmailHandler(req, ctx) {
  const statusFilter = req.query.get('status') || undefined;
  const records = ctx.mailer.list(statusFilter);
  return {
    total: records.length,
    records: records.map((r) => ({
      id: r.id,
      status: r.status,
      sentAt: r.sentAt,
      to: r.message.to,
      subject: r.message.subject,
    })),
  };
}
