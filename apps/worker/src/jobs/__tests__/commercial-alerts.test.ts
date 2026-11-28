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
      {
        siteId: 's1',
        projectId: 'CLIENTA-GB-LON-001',
        r14: true,
        r24: false,
        r26: false,
        r5: false,
        r27: false,
      },
      {
        siteId: 's2',
        projectId: 'CLIENTA-GB-LON-002',
        r14: false,
        r24: false,
        r26: true,
        r5: false,
        r27: false,
      },
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
      gapRef('R5', 's1'),
      gapRef('R27', 's1'),
      gapRef('R26', 's1', 'd1'),
      gapRef('R14', 's2'),
      gapRef('R24', 's2'),
      gapRef('R5', 's2'),
      gapRef('R27', 's2'),
    ]);
  });

  it('raises R5 (P1) for the PM when an accepted project has no invoice (domain/rules.md §5)', async () => {
    const sites = [
      {
        siteId: 's1',
        projectId: 'CLIENTA-GB-LON-001',
        r14: false,
        r24: false,
        r26: false,
        r5: true,
        r27: false,
      },
    ];
    const k = recordingKernel(sites, []);
    await runCommercialAlertsJob(k.kernel);
    const raise = k.calls.find((c) => c.name === 'work.alert.raise')?.input as {
      alerts: { ref: string; level: string; title: string; ownerId?: string }[];
    };
    expect(raise.alerts).toEqual([
      {
        siteId: 's1',
        ref: gapRef('R5', 's1'),
        level: 'P1',
        title:
          'CLIENTA-GB-LON-001: accepted 5 working days ago without a client invoice — record the invoice (R5)',
      },
    ]);
  });

  it('raises R27 (P0) for the PM when the approved installer cost is above the client price (§27)', async () => {
    const sites = [
      {
        siteId: 's1',
        projectId: 'CLIENTA-GB-LON-001',
        r14: false,
        r24: false,
        r26: false,
        r5: false,
        r27: true,
      },
    ];
    const k = recordingKernel(sites, []);
    await runCommercialAlertsJob(k.kernel);
    const raise = k.calls.find((c) => c.name === 'work.alert.raise')?.input as { alerts: unknown[] };
    expect(raise.alerts).toEqual([
      {
        siteId: 's1',
        ref: gapRef('R27', 's1'),
        level: 'P0',
        title:
          'CLIENTA-GB-LON-001: approved installer cost is above the client price — review the margin (R27)',
      },
    ]);
  });
});
