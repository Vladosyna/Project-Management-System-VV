// lifecycle.siteLifecycle.read — E3: a project's steps, its gates (passed / current / not started), the planned
// installation date and R9 readiness, for the Lifecycle tab and the overview stage.
import { z } from 'zod';
import { calendarIds, localDateIn, workingDaysBetween, type CalendarId } from '../../calendar/index.ts';
import { defineQuery, NotFound } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { activeSteps, findActiveSite, findTemplate } from '../repository.ts';
import { installationPlanRule } from '../rules/installation-plan.config.ts';
import { readinessAtRisk } from '../rules/readiness.ts';

/** Assumption: a country without a working calendar yet counts like GB (Mon–Fri, GB holidays). */
const calendarOf = (country: string): CalendarId =>
  (calendarIds as readonly string[]).includes(country) ? (country as CalendarId) : 'GB';

export const siteLifecycle = defineQuery({
  name: 'lifecycle.siteLifecycle.read',
  permission: lifecyclePermissions.siteLifecycle,
  input: z.object({ siteId: z.uuid() }),
  handle: async (ctx, i) => {
    const project = await findActiveSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    const steps = await activeSteps(ctx.tx, project.id);
    const reached = steps.map((s) => s.step);
    const template = project.gateTemplateId ? await findTemplate(ctx.tx, project.gateTemplateId) : undefined;
    const gates = [...(template?.gates ?? [])].sort((a, b) => a.order - b.order);
    const firstOpen = gates.find((g) => !reached.includes(g.key))?.key;
    const today = localDateIn(ctx.now, 'UTC');
    const planned = project.plannedInstallationDate;
    const calendar = calendarOf(project.countryCode);
    const daysTo =
      planned === null
        ? null
        : planned >= today
          ? workingDaysBetween(today, planned, calendar)
          : -workingDaysBetween(planned, today, calendar);
    const templateDays = gates.find((g) => g.readinessDays !== undefined)?.readinessDays;
    const stage = [...installationPlanRule.baseSteps].reverse().find((s) => reached.includes(s)) ?? null;
    return {
      stage,
      steps,
      baseSteps: installationPlanRule.baseSteps,
      template: template ? { id: template.id, name: template.name } : null,
      gates: gates.map((g) => ({
        key: g.key,
        name: g.name,
        status: reached.includes(g.key)
          ? ('passed' as const)
          : g.key === firstOpen
            ? ('current' as const)
            : ('not_started' as const),
        doneOn: steps.find((s) => s.step === g.key)?.doneOn ?? null,
      })),
      plannedInstallationDate: planned,
      workingDaysToInstallation: daysTo,
      readinessAtRisk: readinessAtRisk({ workingDaysToInstallation: daysTo, reached, templateDays }),
    };
  },
});
