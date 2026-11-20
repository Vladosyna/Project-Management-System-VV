// Intake conditions job: what it asks core to do. Core commands have their own integration tests; here a
// recording kernel stands in for them.
import { describe, expect, it } from 'vitest';
import { conditionRef, runIntakeConditionsJob } from '../intake-conditions.ts';

function recordingKernel(expired: unknown[]) {
  const calls: { name: string; input: unknown }[] = [];
  const kernel = {
    execute: (cmd: { name: string }, _actor: unknown, input: unknown) => {
      calls.push({ name: cmd.name, input });
      if (cmd.name === 'intake.conditions.expire') return Promise.resolve({ today: '2026-11-25', expired });
      return Promise.resolve({ created: [{}, {}], existing: 0, skipped: [] });
    },
  };
  return { kernel: kernel as unknown as Parameters<typeof runIntakeConditionsJob>[0], calls };
}

describe('intake conditions job', () => {
  it('raises one action per expired condition for the Sales owner and the director', async () => {
    const expired = [
      {
        conditionId: 'c1',
        siteId: 's1',
        projectId: 'CLIENTA-GB-LON-001',
        itemCode: 'B2',
        deadline: '2026-11-24',
        notify: ['u-sales', 'u-dir'],
      },
    ];
    const k = recordingKernel(expired);
    expect(await runIntakeConditionsJob(k.kernel)).toEqual({ expired: 1, raised: 2 });
    const raise = k.calls.find((c) => c.name === 'work.alert.raise')?.input as {
      alerts: { ref: string; ownerId: string }[];
    };
    expect(raise.alerts.map((a) => [a.ref, a.ownerId])).toEqual([
      [conditionRef('c1', 'u-sales'), 'u-sales'],
      [conditionRef('c1', 'u-dir'), 'u-dir'],
    ]);
  });

  it('raises nothing when nothing expired', async () => {
    const k = recordingKernel([]);
    expect(await runIntakeConditionsJob(k.kernel)).toEqual({ expired: 0, raised: 0 });
    expect(k.calls.map((c) => c.name)).toEqual(['intake.conditions.expire']);
  });
});
