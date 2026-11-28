// Installer alerts job (R29): what it asks core to do (the query has its own integration test).
import { describe, expect, it } from 'vitest';
import { quoteRef, runInstallerAlertsJob } from '../installer-alerts.ts';

function recordingKernel(sites: unknown[]) {
  const calls: { name: string; input: unknown }[] = [];
  const kernel = {
    read: () => Promise.resolve(sites),
    execute: (cmd: { name: string }, _actor: unknown, input: unknown) => {
      calls.push({ name: cmd.name, input });
      return Promise.resolve({ created: [{}], existing: 0, skipped: [], withdrawn: [] });
    },
  };
  return { kernel: kernel as unknown as Parameters<typeof runInstallerAlertsJob>[0], calls };
}

describe('installer alerts job (R29)', () => {
  it('raises R29 (P1) for the PM when a quote is above the average (D-44); withdraws it on the others', async () => {
    const sites = [
      { siteId: 's1', projectId: 'CLIENTA-GB-LON-001', r29: true, labourPercent: 33, totalPercent: 25 },
      { siteId: 's2', projectId: 'CLIENTA-GB-LON-002', r29: false, labourPercent: null, totalPercent: null },
    ];
    const k = recordingKernel(sites);
    await runInstallerAlertsJob(k.kernel);
    const raise = k.calls.find((c) => c.name === 'work.alert.raise')?.input as { alerts: unknown[] };
    expect(raise.alerts).toEqual([
      {
        siteId: 's1',
        ref: quoteRef('s1'),
        level: 'P1',
        title:
          'CLIENTA-GB-LON-001: installer quote per sensor is above the average of comparable quotes (labour +33 %, total +25 %) — check it before approval (R29)',
      },
    ]);
    const resolve = k.calls.find((c) => c.name === 'work.alert.resolve')?.input as { refs: string[] };
    expect(resolve.refs).toEqual([quoteRef('s2')]);
  });
});
