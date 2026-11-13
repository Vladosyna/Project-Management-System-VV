// Worker entry point: runs the device platform job on a fixed interval. Configuration and secrets come from the
// environment / secret store only (CLAUDE.md §3 rule 6); nothing here is a default credential.
// pg-boss scheduling replaces the interval when the queue lands (P-05).
import { createRuntime } from '@ocs/core/runtime';
import { createDevicePlatform } from './adapters/device-platform/index.ts';
import { runDevicePlatformJob } from './jobs/device-platform.ts';

const required = [
  'OCS_DATABASE_URL',
  'OCS_AUTH_SECRET',
  'OCS_PUBLIC_URL',
  'OCS_PLATFORM_URL',
  'OCS_PLATFORM_USERNAME',
  'OCS_PLATFORM_PASSWORD',
  'OCS_PLATFORM_APPKEY',
] as const;
const env = (name: string) => process.env[name] ?? '';
const missing = required.filter((name) => env(name) === '');
if (missing.length > 0) {
  console.error(`worker: missing environment ${missing.join(', ')}`);
  process.exit(2);
}
const minutes = Number(env('OCS_DEVICE_SYNC_MINUTES') || '15');

const runtime = createRuntime({
  databaseUrl: env('OCS_DATABASE_URL'),
  auth: { secret: env('OCS_AUTH_SECRET'), baseURL: env('OCS_PUBLIC_URL') },
});
const platform = createDevicePlatform({
  baseUrl: env('OCS_PLATFORM_URL'),
  username: env('OCS_PLATFORM_USERNAME'),
  password: env('OCS_PLATFORM_PASSWORD'),
  appkey: env('OCS_PLATFORM_APPKEY'),
});

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const run = await runDevicePlatformJob(runtime.kernel, platform);
    console.log(JSON.stringify({ job: 'device-platform', ...run }));
  } catch (error) {
    console.error(
      JSON.stringify({ job: 'device-platform', error: error instanceof Error ? error.name : 'Error' }),
    );
  } finally {
    running = false;
  }
}

await tick();
const timer = setInterval(() => void tick(), minutes * 60_000);
const stop = () => {
  clearInterval(timer);
  void runtime.close().then(() => process.exit(0));
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
