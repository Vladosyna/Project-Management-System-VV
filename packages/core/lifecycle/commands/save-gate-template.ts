// lifecycle.gateTemplate.save — D-32 (Vlad, 14 Nov): a director or above sets the gates of a scope — the base
// template (no client), a client, a client's programme, or one of those narrowed to a country. Saving replaces the
// active template of that scope: the old one is archived, never deleted, and steps already recorded stay.
import { z } from 'zod';
import { defineCommand, ValidationFailed } from '../../kernel/index.ts';
import { lifecyclePermissions } from '../permissions.ts';
import { archiveTemplate, insertTemplate, lockScopeTemplate } from '../repository.ts';
import { installationPlanRule } from '../rules/installation-plan.config.ts';

const gate = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  name: z.string().trim().min(1).max(120),
  /** Working days before installation by which readiness must be confirmed (R9), if this gate sets it. */
  readinessDays: z.int().min(0).max(60).optional(),
});

export const saveGateTemplate = defineCommand({
  name: 'lifecycle.gateTemplate.save',
  permission: lifecyclePermissions.saveGateTemplate,
  input: z
    .object({
      clientId: z.uuid().nullable(),
      programmeId: z.uuid().nullable().default(null),
      countryCode: z
        .string()
        .regex(/^[A-Z]{2}$/)
        .nullable()
        .default(null),
      name: z.string().trim().min(1).max(120),
      /** In order: the first gate is passed first. */
      gates: z.array(gate).min(1).max(20),
    })
    .refine((i) => i.programmeId === null || i.clientId !== null, 'a programme needs its client'),
  describe: (i) => `Save gate template "${i.name}" (${String(i.gates.length)} gates)`,
  handle: async (ctx, i) => {
    const keys = i.gates.map((g) => g.key);
    const base = installationPlanRule.baseSteps as readonly string[];
    const issues = [
      ...(new Set(keys).size === keys.length ? [] : [{ path: 'gates', message: 'a gate key appears twice' }]),
      ...keys
        .filter((k) => base.includes(k))
        .map((k) => ({ path: 'gates', message: `"${k}" is a base step` })),
    ];
    if (issues.length > 0) throw new ValidationFailed(issues);
    const scope = { clientId: i.clientId, programmeId: i.programmeId, countryCode: i.countryCode };
    const previous = await lockScopeTemplate(ctx.tx, scope);
    if (previous) await archiveTemplate(ctx.tx, previous.id, ctx.now);
    const row = {
      id: ctx.newId(),
      ...scope,
      name: i.name,
      gates: i.gates.map((g, n) => ({
        key: g.key,
        name: g.name,
        order: n + 1,
        ...(g.readinessDays === undefined ? {} : { readinessDays: g.readinessDays }),
      })),
      updatedBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    await insertTemplate(ctx.tx, row);
    return {
      result: { id: row.id, replaced: previous?.id ?? null },
      audit: {
        objectType: 'gate_template',
        objectId: row.id,
        clientId: i.clientId,
        before: previous ?? null,
        after: row,
      },
    };
  },
});
