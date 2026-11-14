// devices.firmwareIssue.record — covered with setVersions in set-versions.int.test.ts (D-31); here the guards.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { openTestKernel, ValidationFailed, type TestKernel } from '../../kernel/index.ts';
import { recordFirmwareIssue } from '../commands/record-firmware-issue.ts';

const rnd = aStaffActor({ roles: ['rnd'] });
let testDb: TestDatabase;
let t: TestKernel;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(rnd, recordFirmwareIssue.permission);
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('devices.firmwareIssue.record', () => {
  it('refuses a missing summary or an unknown severity, and records one audited issue', async () => {
    const base = { model: 'G6', firmware: '3.2.1', summary: 'Clock drift', severity: 'info' };
    await expect(
      t.kernel.execute(recordFirmwareIssue, rnd, { ...base, summary: ' ' }, 'test'),
    ).rejects.toBeInstanceOf(ValidationFailed);
    await expect(
      t.kernel.execute(recordFirmwareIssue, rnd, { ...base, severity: 'meh' }, 'test'),
    ).rejects.toBeInstanceOf(ValidationFailed);
    await t.kernel.execute(recordFirmwareIssue, rnd, base, 'test');
    expect(await countRows(testDb.url, 'firmware_issue')).toBe(1);
    expect(await countRows(testDb.url, 'audit_event WHERE command = $1', [recordFirmwareIssue.name])).toBe(1);
  });
});
