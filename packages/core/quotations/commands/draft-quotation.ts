// quotations.quotation.draft — D-40/D-41/D-42, E15 AC2/AC3: a client quotation for a batch of stores of one client and
// country. Formula mode: one line per device model (net price, grossed up by VAT under DDP) and one installation line
// (hours × rate); hours by the time standard over the stores' sensors (G6, G6S, G6 WiFi, B1 — not CBox), an override needs a
// reason; a store's devices default to those registered on the project. A draft — OCS never sends (CLAUDE.md §3 rule 4).
import { z } from 'zod';
import { defineCommand, NotFound, RuleViolation } from '../../kernel/index.ts';
import { quotationsPermissions } from '../permissions.ts';
import {
  activeConfig,
  countNumbered,
  devicesOfSites,
  insertQuotation,
  pricesOf,
  sitesOf,
} from '../repository.ts';
import { grossUp, priced, sensorsOf, standardHours, type Line } from '../rules/quotation.ts';

const devices = z.array(
  z.object({ model: z.string().trim().min(1).max(100), count: z.number().int().min(1).max(1000) }),
);

export const draftQuotation = defineCommand({
  name: 'quotations.quotation.draft',
  permission: quotationsPermissions.draftQuotation,
  input: z.object({
    clientId: z.uuid(),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    title: z.string().trim().min(1).max(300),
    issueDate: z.iso.date(),
    stores: z
      .array(
        z.object({
          siteId: z.uuid(),
          scope: z.enum(['partial', 'full']),
          /** Omitted: the active devices registered on the project (D-42). */
          devices: devices.optional(),
        }),
      )
      .max(200)
      .default([]),
    /** Formula mode: hours as quoted when they differ from the time standard; then a reason is required. */
    quotedHours: z.number().min(0).max(100_000).multipleOf(0.5).optional(),
    hoursReason: z.string().trim().min(1).max(500).optional(),
    installationLabel: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .default('Full on-site installation support and cabling'),
  }),
  describe: (i) => `Draft a quotation for client ${i.clientId} in ${i.countryCode}`,
  handle: async (ctx, i) => {
    const config = await activeConfig(ctx.tx, i.clientId, i.countryCode);
    if (!config) throw new NotFound('quotation settings for this client and country', i.countryCode);
    const vat = config.taxMode === 'ddp_local_vat' ? config.vatRate : null;
    const sites =
      i.stores.length > 0
        ? await sitesOf(
            ctx.tx,
            i.stores.map((s) => s.siteId),
          )
        : [];
    const wrong = i.stores.find((s) => {
      const found = sites.find((x) => x.id === s.siteId);
      return found?.clientId !== i.clientId || found.countryCode !== i.countryCode;
    });
    if (wrong)
      throw new RuleViolation(
        'D-40',
        `store ${wrong.siteId} is not an active site of this client in ${i.countryCode}`,
      );
    const registered = i.stores.some((s) => !s.devices)
      ? await devicesOfSites(
          ctx.tx,
          i.stores.map((s) => s.siteId),
        )
      : [];
    const stores = i.stores.map((s) => ({
      ...s,
      devices:
        s.devices ??
        registered.filter((d) => d.siteId === s.siteId).map((d) => ({ model: d.model, count: d.count })),
    }));

    if (stores.length === 0) throw new RuleViolation('D-40', 'name the stores');
    const empty = stores.find((s) => sensorsOf(s.devices) === 0);
    if (empty) throw new RuleViolation('D-42', `store ${empty.siteId} has no sensors registered or given`);
    const byModel = new Map<string, number>();
    for (const d of stores.flatMap((s) => s.devices))
      byModel.set(d.model, (byModel.get(d.model) ?? 0) + d.count);
    const prices = await pricesOf(ctx.tx, i.clientId, [...byModel.keys()], config.currency);
    const missing = [...byModel.keys()].find((m) => !prices.some((p) => p.model === m));
    if (missing) throw new NotFound(`price of ${missing} in ${config.currency}`, missing);
    const standard = standardHours(stores);
    const hours = i.quotedHours ?? standard;
    if (hours !== standard && !i.hoursReason) {
      throw new RuleViolation(
        'D-40',
        `hours differ from the time standard (${String(standard)}); give a reason`,
      );
    }
    const lines: Line[] = [
      ...[...byModel].map(([model, count]) => ({
        kind: 'device' as const,
        label: model,
        unitPrice: grossUp(prices.find((p) => p.model === model)?.unitPrice ?? '0', vat),
        units: count,
      })),
      {
        kind: 'installation',
        label: `${i.installationLabel} ${String(hours)} hours`,
        unitPrice: grossUp(config.hourlyRate, vat),
        units: hours,
      },
    ];
    const { lines: out, subtotal } = priced(lines);
    const prefix = `${config.numberPrefix}${i.issueDate.replaceAll('-', '')}`;
    const number = `${prefix}${String((await countNumbered(ctx.tx, prefix)) + 1).padStart(2, '0')}`;
    const row = {
      id: ctx.newId(),
      clientId: i.clientId,
      configId: config.id,
      number,
      title: i.title,
      issueDate: i.issueDate,
      lines: out,
      standardHours: String(standard),
      quotedHours: String(hours),
      hoursReason: hours === standard ? null : (i.hoursReason ?? null),
      currency: config.currency,
      subtotal,
      taxMode: config.taxMode,
      // Reverse charge: the recipient pays; DDP local VAT: inside the prices (D-41) — no separate VAT line.
      vatAmount: '0.00',
      total: subtotal,
      createdBy: ctx.actor.id,
      createdAt: ctx.now,
    };
    const covered = stores
      .map((s) => ({
        quotationId: row.id,
        clientId: i.clientId,
        siteId: s.siteId,
        sensorCount: sensorsOf(s.devices),
        scope: s.scope,
      }))
      .filter((s) => s.sensorCount > 0);
    await insertQuotation(ctx.tx, row, covered);
    ctx.emit('quotations.quotation.drafted', { quotationId: row.id, number }, i.clientId);
    return {
      result: {
        id: row.id,
        number,
        standardHours: standard,
        quotedHours: hours,
        lines: out,
        subtotal,
        total: subtotal,
        taxMode: config.taxMode,
      },
      audit: {
        objectType: 'client_quotation',
        objectId: row.id,
        clientId: i.clientId,
        before: null,
        after: row,
      },
    };
  },
});
