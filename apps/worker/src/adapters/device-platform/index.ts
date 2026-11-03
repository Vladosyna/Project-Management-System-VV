// Device platform adapter (07-integrations.md "Device platform"): read-only client, response schemas, fake.
export { createDevicePlatform, PlatformError } from './client.ts';
export type { ClientOptions, DevicePlatform, PlatformCredentials } from './client.ts';
export { fakeDevicePlatform, sampleWorld } from './fake.ts';
export type { FakePlatformWorld } from './fake.ts';
export { statusOf } from './schema.ts';
export type { Device, Gate, Plaza, PlatformStatus } from './schema.ts';
