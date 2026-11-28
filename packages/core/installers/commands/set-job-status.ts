// installers.job.setStatus — E12 AC5/AC6: scheduled (date, after the approval; P-10: schedule changes through the
// Delivery Director — this command is director/PM only), then the visit outcome: done, attended but the site not
// ready (abortive charge per supplier rules), or cancelled before arrival, with a note. R32 (D-34 C3): booking
// (scheduled) is refused until the project's readiness is confirmed.
import { z } from 'zod';
import { defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { readinessConfirmed } from '../../lifecycle/index.ts';
import { installersPermissions } from '../permissions.ts';
import { lockActiveJob, updateJob } from '../repository.ts';
import { checkBookingReadiness } from '../rules/booking-readiness.ts';

const FROM: Record<string, readonly string[]> = {
  scheduled: ['approved', 'scheduled'],
  done: ['scheduled'],
  attended_not_ready: ['scheduled'],
  cancelled: ['planned', 'quoting', 'approved', 'scheduled'],
};

export const setJobStatus = defineCommand({
  name: 'installers.job.setStatus',
  permission: installersPermissions.setJobStatus,
  input: z.object({
    jobId: z.uuid(),
    status: z.enum(['scheduled', 'done', 'attended_not_ready', 'cancelled']),
    scheduledOn: z.iso.date().optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  }),
  describe: (i) => `Set installer job ${i.jobId} to ${i.status}`,
  handle: async (ctx, i) => {
    const job = await lockActiveJob(ctx.tx, i.jobId);
    if (!job) throw new NotFound('installer_job', i.jobId);
    if (!(FROM[i.status] ?? []).includes(job.status)) {
      throw new RuleViolation('E12 AC5', `a ${job.status} job cannot become ${i.status}`);
    }
    if (i.status === 'scheduled' && !i.scheduledOn) {
      throw new RuleViolation('E12 AC5', 'a scheduled job needs its date');
    }
    checkBookingReadiness({
      status: i.status,
      readinessPassed: i.status === 'scheduled' && (await readinessConfirmed(ctx.tx, job.siteId)),
    });
    if (i.status === 'attended_not_ready' && !i.note) {
      throw new RuleViolation('E12 AC6', 'say what was not ready (abortive charge rules)');
    }
    const set = {
      status: i.status,
      ...(i.scheduledOn ? { scheduledOn: i.scheduledOn } : {}),
      ...(i.note ? { outcomeNote: i.note } : {}),
    };
    await updateJob(ctx.tx, job.id, set);
    ctx.emit('installers.job.statusChanged', { jobId: job.id, status: i.status }, job.clientId);
    return {
      result: { id: job.id, status: i.status },
      audit: {
        objectType: 'installer_job',
        objectId: job.id,
        clientId: job.clientId,
        before: { status: job.status, scheduledOn: job.scheduledOn },
        after: set,
      },
    };
  },
});
