// commercial.country.propose — D-45 (3)(4): a client's DPIA or LPA for a whole country; it covers every store of that
// client in the country (clients with compliance scope 'country'). A new record replaces the active one, which is
// archived (never deleted). Entered by a person it is confirmed at once; from an AI agent it waits for a person.
import { z } from 'zod';
import { defineCommand, NotFound } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { findActiveClient, insertCountry, lockActiveCountry, updateCountry } from '../repository.ts';

export const proposeCountry = defineCommand({
  name: 'commercial.country.propose',
  permission: commercialPermissions.proposeCountry,
  input: z.object({
    clientId: z.uuid(),
    countryCode: z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2, e.g. ES'),
    kind: z.enum(['dpia', 'lpa']),
    status: z.enum(['pending', 'approved', 'rejected']),
    /** Agreement or document reference. */
    reference: z.string().trim().min(1).max(100).optional(),
    recordDate: z.iso.date(),
    sourceRef: z.string().trim().min(1).max(500).optional(),
  }),
  describe: (i) => `Record ${i.kind.toUpperCase()} ${i.status} for ${i.countryCode} of client ${i.clientId}`,
  handle: async (ctx, i) => {
    if (!(await findActiveClient(ctx.tx, i.clientId))) throw new NotFound('client', i.clientId);
    const previous = await lockActiveCountry(ctx.tx, i);
    if (previous) await updateCountry(ctx.tx, previous.id, { archivedAt: ctx.now });
    const byAgent = ctx.actor.via !== undefined;
    const row = {
      id: ctx.newId(),
      clientId: i.clientId,
      countryCode: i.countryCode,
      kind: i.kind,
      status: i.status,
      reference: i.reference ?? null,
      recordDate: i.recordDate,
      sourceRef: i.sourceRef ?? null,
      proposedBy: ctx.actor.id,
      proposedVia: byAgent ? ('ai' as const) : ('web' as const),
      confirmedBy: byAgent ? null : ctx.actor.id,
      confirmedAt: byAgent ? null : ctx.now,
      createdAt: ctx.now,
    };
    await insertCountry(ctx.tx, row);
    ctx.emit(
      'commercial.country.proposed',
      { recordId: row.id, countryCode: row.countryCode, kind: row.kind, confirmed: !byAgent },
      row.clientId,
    );
    return {
      result: { id: row.id, confirmed: !byAgent, replaced: previous?.id ?? null },
      audit: {
        objectType: 'country_compliance',
        objectId: row.id,
        clientId: row.clientId,
        before: previous ?? null,
        after: row,
      },
    };
  },
});
