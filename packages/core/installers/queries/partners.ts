// installers.partners.read — E12: the installer companies to choose from on a job or quote, with their internal name
// and country. Staff only (partner real names never reach clients, CLAUDE.md §3 rule 5).
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { installersPermissions } from '../permissions.ts';
import { activePartners } from '../repository.ts';

export const partners = defineQuery({
  name: 'installers.partners.read',
  permission: installersPermissions.partners,
  input: z.object({}),
  handle: async (ctx) => activePartners(ctx.tx),
});
