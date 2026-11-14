// Scheduled jobs against a real PostgreSQL: pg-boss installs its schema, the job is scheduled, and a job sent to
// its queue runs the callback once.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { PgBoss } from 'pg-boss';
import { cronEvery, startScheduledJobs, type JobScheduler } from '../queue.ts';

let testDb: TestDatabase;
let scheduler: JobScheduler;
let runs = 0;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  scheduler = await startScheduledJobs(testDb.url, [
    {
      name: 'device-platform',
      everyMinutes: 15,
      run: () => {
        runs += 1;
        return Promise.resolve();
      },
    },
  ]);
});

afterAll(async () => {
  await scheduler.stop();
  await testDb.drop();
});

describe('scheduled jobs (pg-boss, P-05)', () => {
  it('turns the interval into a cron, refusing nonsense', () => {
    expect([cronEvery(15), cronEvery(1)]).toEqual(['*/15 * * * *', '* * * * *']);
    expect(() => cronEvery(0)).toThrow();
    expect(() => cronEvery(90)).toThrow();
  });

  it('schedules the job and runs it when a job arrives', async () => {
    expect(await countRows(testDb.url, `pgboss.schedule WHERE name = 'device-platform'`)).toBe(1);
    const sender = new PgBoss({ connectionString: testDb.url, schema: 'pgboss' });
    await sender.start();
    await sender.send('device-platform', {});
    await sender.stop({ graceful: false });
    const deadline = Date.now() + 30_000;
    while (runs === 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
    expect(runs).toBe(1);
  });
});
