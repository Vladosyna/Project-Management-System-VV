// devices.firmwareIssue.record — D-31: R&D records a known problem of one firmware version of one model, once;
// every project with a matching device then shows it. Reference data, not client data; never shown to clients.
import { z } from 'zod';
import { defineCommand } from '../../kernel/index.ts';
import { devicesPermissions } from '../permissions.ts';
import { insertFirmwareIssue } from '../repository.ts';

export const recordFirmwareIssue = defineCommand({
  name: 'devices.firmwareIssue.record',
  permission: devicesPermissions.recordFirmwareIssue,
  input: z.object({
    model: z.string().trim().min(1).max(50),
    firmware: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(1).max(500),
    severity: z.enum(['info', 'degraded', 'critical']),
    /** Where it is documented: release note, case number, ticket. No secrets, no client data. */
    source: z.string().trim().min(1).max(300).optional(),
  }),
  describe: (i) => `Record a ${i.severity} issue of ${i.model} firmware ${i.firmware}`,
  handle: async (ctx, i) => {
    const row = {
      id: ctx.newId(),
      model: i.model,
      firmware: i.firmware,
      summary: i.summary,
      severity: i.severity,
      source: i.source ?? null,
      createdBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    await insertFirmwareIssue(ctx.tx, row);
    ctx.emit(
      'devices.firmwareIssue.recorded',
      { issueId: row.id, model: row.model, firmware: row.firmware },
      null,
    );
    return {
      result: { id: row.id },
      audit: { objectType: 'firmware_issue', objectId: row.id, clientId: null, before: null, after: row },
    };
  },
});
