// lifecycle.programmeTracker.read — E11 AC3 (D-34 C5): the programme tracker that replaces the hand-kept Excel
// tracker — stores, dates, status and gates, one row per active project the actor may see (RLS), filtered by client,
// programme or country. Read in three queries whatever the number of projects; each row is read exactly like the
// Lifecycle tab (lifecycleView).
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSites, activeStepsOf, activeTemplates, pickTemplate } from '../repository.ts';
import { lifecycleView } from './lifecycle-view.ts';

export const programmeTracker = defineQuery({
  name: 'lifecycle.programmeTracker.read',
  permission: lifecyclePermissions.programmeTracker,
  input: z.object({
    clientId: z.uuid().optional(),
    programmeId: z.uuid().optional(),
    /** ISO 3166 alpha-2, as on the site (D-18). */
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  }),
  handle: async (ctx, i) => {
    const sites = await activeSites(ctx.tx, i);
    const steps = await activeStepsOf(
      ctx.tx,
      sites.map((s) => s.id),
    );
    const templates = await activeTemplates(ctx.tx);
    return sites.map((s) => ({
      siteId: s.id,
      projectId: s.projectId,
      name: s.name,
      clientId: s.clientId,
      programmeId: s.programmeId,
      countryCode: s.countryCode,
      cityName: s.cityName,
      standard: s.standard,
      ...lifecycleView({
        steps: steps.filter((st) => st.siteId === s.id),
        gates: pickTemplate(templates, s)?.gates ?? [],
        plannedInstallationDate: s.plannedInstallationDate,
        countryCode: s.countryCode,
        now: ctx.now,
      }),
    }));
  },
});
