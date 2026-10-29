// Fake clock for working-day and SLA logic (04-testing §7). Pass `clock.now` wherever a clock is
// injected, e.g. createKernel({ clock: clock.now }), then move time explicitly.

export interface FakeClock {
  /** Current fake time; a fresh Date each call. Bound, so it can be passed as a function. */
  readonly now: () => Date;
  set(to: Date | string): void;
  advance(by: { days?: number; hours?: number; minutes?: number; seconds?: number }): void;
}

export function createFakeClock(start: Date | string): FakeClock {
  let current = new Date(start).getTime();
  if (Number.isNaN(current)) throw new Error(`Invalid start time: ${String(start)}`);
  return {
    now: () => new Date(current),
    set(to) {
      const next = new Date(to).getTime();
      if (Number.isNaN(next)) throw new Error(`Invalid time: ${String(to)}`);
      current = next;
    },
    advance({ days = 0, hours = 0, minutes = 0, seconds = 0 }) {
      current += ((days * 24 + hours) * 60 + minutes) * 60_000 + seconds * 1000;
    },
  };
}
