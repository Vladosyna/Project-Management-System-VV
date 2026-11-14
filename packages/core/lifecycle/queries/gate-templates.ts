// lifecycle.gateTemplates.read — D-32: the active gate templates with their scope, for the settings screen.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeTemplates } from '../repository.ts';

export const gateTemplates = defineQuery({
  name: 'lifecycle.gateTemplates.read',
  permission: lifecyclePermissions.gateTemplates,
  input: z.object({}),
  handle: async (ctx) =>
    (await activeTemplates(ctx.tx)).map((t) => ({
      id: t.id,
      clientId: t.clientId,
      programmeId: t.programmeId,
      countryCode: t.countryCode,
      name: t.name,
      gates: [...t.gates].sort((a, b) => a.order - b.order),
      since: t.createdAt.toISOString(),
    })),
});
