// installers.approval.record — E12 AC4 (supplier rules P-11, P-12): a person records the CEO's approval of the chosen
// quote with its reference. At least two confirmed quotes from different installers on the same SOW version, or a
// reason for a single (urgent) quote. Never by an AI agent: it may only prepare the request. One approval per job.
import { z } from 'zod';
import { Conflict, defineCommand, Forbidden, NotFound, RuleViolation } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import {
  activeApproval,
  confirmedQuotesOfJob,
  insertApproval,
  lockActiveJob,
  updateJob,
} from '../repository.ts';

export const recordApproval = defineCommand({
  name: 'installers.approval.record',
  permission: installersPermissions.recordApproval,
  input: z.object({
    jobId: z.uuid(),
    quoteId: z.uuid(),
    /** DingTalk OA approval number or message link (P-11). */
    approvalRef: z.string().trim().min(1).max(500),
    approvedOn: z.iso.date(),
    singleQuoteReason: z.string().trim().min(1).max(1000).optional(),
  }),
  describe: (i) => `Record the CEO's approval of quote ${i.quoteId} for installer job ${i.jobId}`,
  handle: async (ctx, i) => {
    if (ctx.actor.via !== undefined)
      throw new Forbidden('installers.approval.record (a person, not an AI agent)');
    const job = await lockActiveJob(ctx.tx, i.jobId);
    if (!job) throw new NotFound('installer_job', i.jobId);
    if (await activeApproval(ctx.tx, job.id)) throw new Conflict('this job already has an approved quote');
    const quotes = await confirmedQuotesOfJob(ctx.tx, job.id);
    const chosen = quotes.find((q) => q.id === i.quoteId);
    if (!chosen) throw new NotFound('confirmed quote of this job', i.quoteId);
    const comparable = new Set(
      quotes.filter((q) => q.sowVersion === chosen.sowVersion).map((q) => q.partnerId),
    );
    if (comparable.size < 2 && !i.singleQuoteReason) {
      throw new RuleViolation(
        'P-12',
        'two comparable quotes on the same SOW, or a reason for a single quote',
      );
    }
    const row = {
      id: ctx.newId(),
      clientId: job.clientId,
      jobId: job.id,
      proposalId: chosen.id,
      approvalRef: i.approvalRef,
      approvedOn: i.approvedOn,
      singleQuoteReason: comparable.size < 2 ? (i.singleQuoteReason ?? null) : null,
      recordedBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    await insertApproval(ctx.tx, row);
    await updateJob(ctx.tx, job.id, { status: 'approved', partnerId: chosen.partnerId });
    ctx.emit('installers.approval.recorded', { jobId: job.id, quoteId: chosen.id }, job.clientId);
    return {
      result: { id: row.id, comparableQuotes: comparable.size },
      audit: {
        objectType: 'quote_approval',
        objectId: row.id,
        clientId: job.clientId,
        before: null,
        after: row,
      },
    };
  },
});
