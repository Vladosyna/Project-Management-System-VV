// installers.job.create — E12 AC1 (D-34 N1): an installer job on a site — installer, scope (partial: our engineer
// configures; full: the installer does everything on site), sensors, SOW version. Status starts at planned.
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { activePartner, findActiveSite, insertJob } from '../repository.ts';

export const createJob = defineCommand({
  name: 'installers.job.create',
  permission: installersPermissions.createJob,
  input: z.object({
    siteId: z.uuid(),
    /** The installer company (partner); may be chosen later, after the quotes. */
    partnerId: z.uuid().optional(),
    scope: z.enum(['partial', 'full']),
    sensorCount: z.number().int().min(1).max(10_000),
    sowVersion: z.string().trim().min(1).max(50).optional(),
  }),
  describe: (i) =>
    `Create an installer job (${i.scope}, ${String(i.sensorCount)} sensors) on site ${i.siteId}`,
  handle: async (ctx, i) => {
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    if (i.partnerId && !(await activePartner(ctx.tx, i.partnerId)))
      throw new NotFound('partner', i.partnerId);
    const row = {
      id: ctx.newId(),
      clientId: project.clientId,
      siteId: project.id,
      partnerId: i.partnerId ?? null,
      scope: i.scope,
      sensorCount: i.sensorCount,
      sowVersion: i.sowVersion ?? null,
      createdBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    await insertJob(ctx.tx, row);
    ctx.emit('installers.job.created', { jobId: row.id, siteId: row.siteId }, row.clientId);
    return {
      result: { id: row.id },
      audit: {
        objectType: 'installer_job',
        objectId: row.id,
        clientId: row.clientId,
        before: null,
        after: row,
      },
    };
  },
});
