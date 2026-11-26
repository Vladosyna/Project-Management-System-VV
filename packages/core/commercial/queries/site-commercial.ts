// commercial.site.read — E13 AC1: a site's active commercial records, confirmed and proposed, money in the original
// currency and in EUR with the rate used.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { activeRecordsOfSite } from '../repository.ts';

export const siteCommercial = defineQuery({
  name: 'commercial.site.read',
  permission: commercialPermissions.siteCommercial,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) =>
    (await activeRecordsOfSite(ctx.tx, i.siteId)).map((r) => ({
      id: r.id,
      kind: r.kind,
      reference: r.reference,
      status: r.status,
      recordDate: r.recordDate,
      money:
        r.amount === null
          ? null
          : {
              amount: r.amount,
              currency: r.currency,
              eur: r.eurAmount,
              fxRate: r.fxRate,
              fxDate: r.fxDate,
              fxSource: r.fxSource,
            },
      sourceRef: r.sourceRef,
      proposedVia: r.proposedVia,
      confirmed: r.confirmedAt !== null,
    })),
});
