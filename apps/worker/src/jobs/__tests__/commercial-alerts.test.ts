// Commercial alerts job: what it asks core to do (core queries and commands have their own integration tests).
import { describe, expect, it } from 'vitest';
import { gapRef, runCommercialAlertsJob } from '../commercial-alerts.ts';

function recordingKernel(sites: unknown[], directors: string[]) {
  const calls: { name: string; input: unknown }[] = [];
  const kernel = {
    read: () => Promise.resolve({ sites, directors }),
    execute: (cmd: { name: string }, _actor: unknown, input: unknown) => {
      calls.push({ name: cmd.name, input });
      return Promise.resolve({ created: [{}], existing: 0, skipped: [], withdrawn: [] });
    },
  };
  return { kernel: kernel as unknown as Parameters<typeof runCommercialAlertsJob>[0], calls };
}

describe('commercial alerts job', () => {
  it('raises R14/R24 for the PM and R26 for each director; withdraws closed gaps', async () => {
    const sites = [
      { siteId: 's1', projectId: 'CLIENTA-GB-LON-001', r14: true, r24: false, r26: false },
      { siteId: 's2', projectId: 'CLIENTA-GB-LON-002', r14: false, r24: false, r26: true },
    ];
    const k = recordingKernel(sites, ['d1']);
    await runCommercialAlertsJob(k.kernel);
    const raise = k.calls.find((c) => c.name === 'work.alert.raise')?.input as {
      alerts: { ref: string; ownerId?: string }[];
    };
    expect(raise.alerts.map((a) => [a.ref, a.ownerId])).toEqual([
      [gapRef('R14', 's1'), undefined],
      [gapRef('R26', 's2', 'd1'), 'd1'],
    ]);
    const resolve = k.calls.find((c) => c.name === 'work.alert.resolve')?.input as { refs: string[] };
    expect(resolve.refs).toEqual([
      gapRef('R24', 's1'),
      gapRef('R26', 's1', 'd1'),
      gapRef('R14', 's2'),
      gapRef('R24', 's2'),
    ]);
  });
});
