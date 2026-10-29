import { expect, it } from 'vitest';
import { createFakeClock } from '../index.ts';

it('stays still until moved, then advances by exactly the requested amount', () => {
  const clock = createFakeClock('2026-11-02T09:00:00Z');
  expect(clock.now().toISOString()).toBe('2026-11-02T09:00:00.000Z');
  clock.advance({ days: 2, hours: 3, minutes: 30 });
  expect(clock.now().toISOString()).toBe('2026-11-04T12:30:00.000Z');
  clock.set('2027-01-20T00:00:00Z');
  expect(clock.now().toISOString()).toBe('2027-01-20T00:00:00.000Z');
});

it('hands out copies, so callers cannot move time by mutating a Date', () => {
  const clock = createFakeClock('2026-11-02T09:00:00Z');
  const { now } = clock; // works unbound, e.g. createKernel({ clock: clock.now })
  now().setUTCFullYear(2030);
  expect(now().getUTCFullYear()).toBe(2026);
});

it('rejects invalid times', () => {
  expect(() => createFakeClock('not a date')).toThrow();
});
