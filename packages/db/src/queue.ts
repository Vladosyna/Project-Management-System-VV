// Scheduled jobs (P-05: pg-boss on the OCS PostgreSQL, no extra infrastructure). Apps reach it through
// @ocs/core/runtime. Each job runs on a cron schedule; pg-boss runs one job per tick across every worker
// instance, so two replicas never run it twice; a failed run is retried; runs never overlap (singleton queue).
import { PgBoss } from 'pg-boss';

export interface ScheduledJob {
  /** Queue name, e.g. "device-platform". */
  readonly name: string;
  /** How often, in minutes (1–59). */
  readonly everyMinutes: number;
  readonly run: () => Promise<unknown>;
}

export interface JobScheduler {
  stop(): Promise<void>;
}

export function cronEvery(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 59) {
    throw new Error('a job interval must be a whole number of minutes from 1 to 59');
  }
  return minutes === 1 ? '* * * * *' : `*/${String(minutes)} * * * *`;
}

/** `connectionString`: a role allowed to create and own the `pgboss` schema (deploy step). */
export async function startScheduledJobs(
  connectionString: string,
  jobs: readonly ScheduledJob[],
): Promise<JobScheduler> {
  const boss = new PgBoss({ connectionString, schema: 'pgboss' });
  boss.on('error', (error: unknown) => {
    console.error(JSON.stringify({ queue: 'pg-boss', error: error instanceof Error ? error.name : 'Error' }));
  });
  await boss.start();
  for (const job of jobs) {
    await boss.createQueue(job.name, { policy: 'singleton', retryLimit: 2, retryDelay: 60 });
    await boss.schedule(job.name, cronEvery(job.everyMinutes));
    await boss.work(job.name, async () => {
      await job.run();
    });
  }
  return { stop: () => boss.stop({ graceful: true }) };
}
