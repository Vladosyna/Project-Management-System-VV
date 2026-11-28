// commercial.weeklyChanges.read — E11 AC1 (D-44 (5)): the Friday report per client, commercial part: the client's
// commercial records (PO, invoice, DPIA, price list) added, confirmed or archived in one week (Monday 00:00 to next
// Monday 00:00 UTC), oldest first. A record a person enters is confirmed at once and shows once, as added; an AI
// proposal shows as added (not confirmed), then as confirmed. Assumption: weeks run in UTC.
import { z } from 'zod';
import { weekday } from '../../calendar/index.ts';
import { defineQuery } from '../../kernel/index.ts';
import { commercialPermissions } from '../permissions.ts';
import { recordsChangedBetween } from '../repository.ts';

const RANK = { added: 0, confirmed: 1, archived: 2 } as const;
type Change = keyof typeof RANK;

export const weeklyChanges = defineQuery({
  name: 'commercial.weeklyChanges.read',
  permission: commercialPermissions.weeklyChanges,
  input: z.object({
    clientId: z.uuid(),
    weekStart: z.iso.date().refine((d) => weekday(d) === 1, 'a week starts on a Monday'),
  }),
  handle: async (ctx, i) => {
    const from = new Date(`${i.weekStart}T00:00:00Z`);
    const to = new Date(from.getTime() + 7 * 86_400_000);
    const inWeek = (d: Date | null): d is Date => d !== null && d >= from && d < to;
    const rows = await recordsChangedBetween(ctx.tx, i.clientId, from, to);
    const changes = rows.flatMap(({ record: r, projectId }) => {
      const sameAsCreated = r.confirmedAt?.getTime() === r.createdAt.getTime();
      const events: [Change, Date | null][] = [
        ['added', r.createdAt],
        ['confirmed', sameAsCreated ? null : r.confirmedAt],
        ['archived', r.archivedAt],
      ];
      return events
        .filter((e): e is [Change, Date] => inWeek(e[1]))
        .map(([change, at]) => ({
          at,
          rank: RANK[change],
          id: r.id,
          line: {
            change,
            on: at.toISOString().slice(0, 10),
            siteId: r.siteId,
            projectId,
            kind: r.kind,
            part: r.part,
            reference: r.reference,
            status: r.status,
            eur: r.eurAmount,
            /** On an added line: whether it was confirmed when added (an AI proposal is not). */
            confirmed: change === 'added' ? sameAsCreated : r.confirmedAt !== null,
          },
        }));
    });
    changes.sort((a, b) => a.at.getTime() - b.at.getTime() || a.rank - b.rank || a.id.localeCompare(b.id));
    return { weekStart: i.weekStart, changes: changes.map((c) => c.line) };
  },
});
