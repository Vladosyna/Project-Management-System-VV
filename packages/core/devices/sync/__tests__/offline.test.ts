// offline_since and the offline events, case by case (E4, R15 measures from offline_since).
import { describe, expect, it } from 'vitest';
import { offlineChange } from '../offline.ts';

const now = new Date('2026-11-03T10:00:00Z');
const earlier = new Date('2026-11-02T08:00:00Z');

describe('offlineChange', () => {
  it.each([
    ['new device seen online', 'online', null, null, null],
    ['new device seen offline', 'offline', null, now, 'went_offline'],
    ['online → offline', 'offline', { status: 'online', offlineSince: null }, now, 'went_offline'],
    [
      'still offline keeps the first time',
      'offline',
      { status: 'offline', offlineSince: earlier },
      earlier,
      null,
    ],
    ['offline → online', 'online', { status: 'offline', offlineSince: earlier }, null, 'offline_ended'],
    ['offline → disabled', 'disabled', { status: 'offline', offlineSince: earlier }, null, 'offline_ended'],
    ['never synced → offline', 'offline', { status: null, offlineSince: null }, now, 'went_offline'],
  ] as const)('%s', (_name, next, before, since, event) => {
    expect(offlineChange(now, next, before)).toEqual({ offlineSince: since, event });
  });
});
