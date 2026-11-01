// org.site.list — E1 AC1. RLS limits the rows: staff see every site, a client user only its own
// client-visible sites.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { listActiveSites } from '../repository.ts';

export const siteList = defineQuery({
  name: 'org.site.list',
  permission: orgPermissions.siteList,
  input: z.object({ clientId: z.uuid().optional() }),
  handle: async (ctx, i) =>
    (await listActiveSites(ctx.tx, i.clientId)).map((s) => ({
      id: s.id,
      clientId: s.clientId,
      projectId: s.projectId,
      name: s.name,
      countryCode: s.countryCode,
      cityCode: s.cityCode,
      cityName: s.cityName,
      standard: s.standard,
    })),
});
