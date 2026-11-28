// Installer alerts job (R29, R12): what it asks core to do (the queries have their own integration tests).
import { describe, expect, it } from 'vitest';
import { designRef, quoteRef, runInstallerAlertsJob } from '../installer-alerts.ts';

function recordingKernel(sites: unknown[], design: unknown[] = []) {
  const calls: { name: string; input: unknown }[] = [];
  const kernel = {
    read: (query: { name: string }) =>
      Promise.resolve(query.name === 'installers.designChecks.read' ? design : sites),
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

describe('installer alerts job (R12)', () => {
  it('raises R12 (P0) when an open job counts other sensors than the design; withdraws it on the others', async () => {
    const design = [
      { siteId: 's1', projectId: 'CLIENTA-GB-LON-001', r12: true, jobSensors: 12, designSensors: 13 },
      { siteId: 's2', projectId: 'CLIENTA-GB-LON-002', r12: false, jobSensors: null, designSensors: null },
    ];
    const k = recordingKernel([], design);
    await runInstallerAlertsJob(k.kernel);
    const raise = k.calls.find((c) => c.name === 'work.alert.raise')?.input as { alerts: unknown[] };
    expect(raise.alerts).toEqual([
      {
        siteId: 's1',
        ref: designRef('s1'),
        level: 'P0',
        title:
          'CLIENTA-GB-LON-001: installer job counts 12 sensors but the store design has 13 — correct the job or the design (R12)',
      },
    ]);
    const resolves = k.calls
      .filter((c) => c.name === 'work.alert.resolve')
      .map((c) => c.input as { refs: string[] });
    expect(resolves.flatMap((r) => r.refs)).toEqual([designRef('s2')]);
  });
});
