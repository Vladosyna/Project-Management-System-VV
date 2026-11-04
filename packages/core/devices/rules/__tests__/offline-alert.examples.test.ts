// R15 (domain/rules.md §15) — examples: device → alert due or not, including the boundary cases (ocs-sop-rule §3).
import { describe, expect, it } from 'vitest';
import { isOfflineAlertDue, type OfflineAlertInput } from '../offline-alert.ts';
import { offlineAlertRule } from '../offline-alert.config.ts';

const now = new Date('2026-11-04T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const offline = (h: number): OfflineAlertInput => ({
  platformStatus: 'offline',
  offlineSince: hoursAgo(h),
  alertsEnabled: true,
});
const examples: { name: string; input: OfflineAlertInput; due: boolean }[] = [
  { name: 'offline 25 h', input: offline(25), due: true },
  { name: 'offline exactly 24 h (not more than)', input: offline(24), due: false },
  { name: 'offline 23 h', input: offline(23), due: false },
  {
    name: 'offline 3 days, alerts off (not live)',
    input: { ...offline(72), alertsEnabled: false },
    due: false,
  },
  { name: 'online', input: { ...offline(25), platformStatus: 'online', offlineSince: null }, due: false },
  { name: 'disabled on the platform', input: { ...offline(25), platformStatus: 'disabled' }, due: false },
  {
    name: 'never synced',
    input: { platformStatus: null, offlineSince: null, alertsEnabled: true },
    due: false,
  },
];

describe(`${offlineAlertRule.cite} offline alert`, () => {
  it.each(examples)('$name → $due', ({ input, due }) => {
    expect(isOfflineAlertDue(input, now)).toBe(due);
  });
});
