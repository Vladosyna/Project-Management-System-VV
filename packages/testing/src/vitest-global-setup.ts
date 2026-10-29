// Vitest globalSetup for integration projects: one PostgreSQL server per run, URL provided to tests
// as inject('postgresUrl').
import type { TestProject } from 'vitest/node';
import { startPostgresServer } from './postgres.ts';

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const server = await startPostgresServer();
  project.provide('postgresUrl', server.url);
  return () => server.stop();
}
