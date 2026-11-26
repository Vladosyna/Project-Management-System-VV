// commercial.gaps.read — the hourly alert run (domain/rules.md, D-34 N2): every active site with its commercial gaps.
// R14 installed without a confirmed client PO; R24 installed without an approved DPIA; R26 no owner (no PM). Only
// confirmed records count: an AI proposal is not yet a fact. The system actor only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { commercialGaps, directorIds } from '../repository.ts';

export const gaps = defineQuery({
  name: 'commercial.gaps.read',
  permission: commercialPermissions.gaps,
  input: z.object({}),
  handle: async (ctx) => {
    const { sites, installed, records } = await commercialGaps(ctx.tx);
    const has = (siteId: string, kind: string, status?: string) =>
      records.some(
        (r) => r.siteId === siteId && r.kind === kind && (status === undefined || r.status === status),
      );
    const rows = sites.map((s) => ({
      siteId: s.id,
      projectId: s.projectId,
      r14: installed.has(s.id) && !has(s.id, 'client_po'),
      r24: installed.has(s.id) && !has(s.id, 'dpia', 'approved'),
      r26: s.pmId === null,
    }));
    /** R26 has no PM to own it: the Delivery Directors get it. */
    return { sites: rows, directors: await directorIds(ctx.tx) };
  },
});
