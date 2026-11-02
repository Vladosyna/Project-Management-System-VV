// org.site.create — E1 AC1, AC2: one SOP-DEL-02 project/site under a client, with its Project ID
// CLIENT-CC-CITY-NNN (SOP-DEL-02 §3, D-18). The running number counts per client and city and is never
// reused; the database keeps the Project ID unique and immutable (migration 0004).
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { findActiveProgrammeOf, insertSite, lockActiveClient, maxRunningNo } from '../repository.ts';
import { projectIdOf } from '../rules/project-id.ts';

const code = z.string().trim().toUpperCase();

export const createSite = defineCommand({
  name: 'org.site.create',
  permission: orgPermissions.createSite,
  input: z.object({
    clientId: z.uuid(),
    /** Optional level 1a (SOP-DEL-02 §3); must be a programme of the same client. */
    programmeId: z.uuid().optional(),
    countryCode: code,
    cityCode: code,
    cityName: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    /** Proposed by Sales, confirmed at the intake review (SOP-DEL-02 §2.1); "when in doubt, L". */
    standard: z.enum(['L', 'S']),
  }),
  describe: (i) => `Create site ${i.name} in ${i.cityName} for client ${i.clientId}`,
  handle: async (ctx, i) => {
    const owner = await lockActiveClient(ctx.tx, i.clientId);
    if (!owner) throw new NotFound('client', i.clientId);
    if (i.programmeId && !(await findActiveProgrammeOf(ctx.tx, owner.id, i.programmeId))) {
      throw new NotFound('programme', i.programmeId);
    }
    const runningNo = (await maxRunningNo(ctx.tx, owner.id, i.cityCode)) + 1;
    const projectId = projectIdOf({
      shortCode: owner.shortCode,
      countryCode: i.countryCode,
      cityCode: i.cityCode,
      runningNo,
    });
    const row = {
      id: ctx.newId(),
      clientId: owner.id,
      projectId,
      countryCode: i.countryCode,
      cityCode: i.cityCode,
      cityName: i.cityName,
      runningNo,
      name: i.name,
      standard: i.standard,
      programmeId: i.programmeId ?? null,
    };
    await insertSite(ctx.tx, { ...row, createdAt: ctx.now });
    ctx.emit('org.site.created', { siteId: row.id, projectId }, owner.id);
    return {
      result: { id: row.id, projectId },
      audit: { objectType: 'site', objectId: row.id, clientId: owner.id, before: null, after: row },
    };
  },
});
