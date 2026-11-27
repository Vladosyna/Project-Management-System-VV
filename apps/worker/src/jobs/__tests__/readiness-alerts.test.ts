// Readiness alerts job (R9): what it asks core to do (the query has its own integration test).
import { describe, expect, it } from 'vitest';
import { readinessRef, runReadinessAlertsJob } from '../readiness-alerts.ts';

function recordingKernel(sites: unknown[]) {
  const calls: { name: string; input: unknown }[] = [];
  const kernel = {
    read: () => Promise.resolve(sites),
    execute: (cmd: { name: string }, _actor: unknown, input: unknown) => {
      calls.push({ name: cmd.name, input });
      return Promise.resolve({ created: [{}], existing: 0, skipped: [], withdrawn: [] });
    },
  };
  return { kernel: kernel as unknown as Parameters<typeof runReadinessAlertsJob>[0], calls };
}

describe('readiness alerts job (R9)', () => {
  it('raises R9 for the PM of each project at risk; withdraws it on the others', async () => {
    const sites = [
      { siteId: 's1', projectId: 'CLIENTA-GB-LON-001', r9: true, plannedInstallationDate: '2026-12-09' },
      { siteId: 's2', projectId: 'CLIENTA-GB-LON-002', r9: false, plannedInstallationDate: null },
    ];
    const k = recordingKernel(sites);
    expect(await runReadinessAlertsJob(k.kernel)).toEqual({ raised: 1, withdrawn: 0 });
    const raise = k.calls.find((c) => c.name === 'work.alert.raise')?.input as {
      alerts: { siteId: string; ref: string; title: string; ownerId?: string }[];
    };
    expect(raise.alerts).toEqual([
      {
        siteId: 's1',
        ref: readinessRef('s1'),
        title:
          'CLIENTA-GB-LON-001: installation 2026-12-09, readiness not confirmed — confirm it or move the date (R9)',
      },
    ]);
    const resolve = k.calls.find((c) => c.name === 'work.alert.resolve')?.input as { refs: string[] };
    expect(resolve.refs).toEqual([readinessRef('s2')]);
  });

  it('asks nothing when there are no projects', async () => {
    const k = recordingKernel([]);
    expect(await runReadinessAlertsJob(k.kernel)).toEqual({ raised: 0, withdrawn: 0 });
    expect(k.calls).toEqual([]);
  });
});
