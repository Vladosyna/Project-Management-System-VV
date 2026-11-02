// org.partner.list — staff view: partners with real names and the letter each client knows them by.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { partnersWithLetters } from '../repository.ts';

interface PartnerView {
  id: string;
  realName: string;
  countryCode: string;
  labels: { clientId: string; label: string }[];
}

export const partnerList = defineQuery({
  name: 'org.partner.list',
  permission: orgPermissions.partnerList,
  input: z.object({}),
  handle: async (ctx) => {
    const byId = new Map<string, PartnerView>();
    for (const r of await partnersWithLetters(ctx.tx)) {
      const view = byId.get(r.id) ?? {
        id: r.id,
        realName: r.realName,
        countryCode: r.countryCode,
        labels: [],
      };
      if (r.clientId && r.letter) view.labels.push({ clientId: r.clientId, label: `Partner ${r.letter}` });
      byId.set(r.id, view);
    }
    return [...byId.values()];
  },
});
