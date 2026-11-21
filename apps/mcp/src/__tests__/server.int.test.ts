// D-33: an AI agent connected over MCP gets exactly its person's operations and acts through the kernel.
// A real MCP client (the SDK's) talks to the server over an in-memory transport; the kernel and database are real.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createClient, createSite } from '@ocs/core/org';
import { saveHandoverCard, submitHandoverCard, handoverCardView } from '@ocs/core/intake';
import { openTestKernel, type TestKernel } from '@ocs/core/kernel';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { createOcsMcpServer } from '../server.ts';

const sales = aStaffActor({ roles: ['sales'] });
let testDb: TestDatabase;
let t: TestKernel;
let client: Client;
let siteId: string;
const call = async (name: string, args: Record<string, unknown>) =>
  (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: { text: string }[] };
const body = (r: { content: { text: string }[] }) =>
  JSON.parse(r.content[0]?.text ?? 'null') as Record<string, unknown>;

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  const setup = aStaffActor({ roles: ['director'] });
  t.grant(setup, createClient.permission, createSite.permission);
  t.grant(sales, saveHandoverCard.permission, submitHandoverCard.permission, handoverCardView.permission);
  const a = await t.kernel.execute(createClient, setup, { shortCode: 'CLIENTA', name: 'Client A' }, 'test');
  const place = { countryCode: 'GB', cityCode: 'LON', cityName: 'London', name: 'Mall A', standard: 'L' };
  ({ id: siteId } = await t.kernel.execute(createSite, setup, { clientId: a.id, ...place }, 'test'));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createOcsMcpServer(t.kernel, sales).connect(serverSide);
  client = new Client({ name: 'test-agent', version: '1.0.0' });
  await client.connect(clientSide);
});

afterAll(async () => {
  await client.close();
  await t.close();
  await testDb.drop();
});

describe('OCS MCP server', () => {
  it("lists only its person's operations, with JSON Schemas and read-only hints; never system-only ones", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((x) => x.name);
    expect(names).toContain('intake_handoverCard_save');
    expect(names).not.toContain('intake_review_decide');
    expect(names).not.toContain('devices_platform_syncDevices');
    expect(names.every((n) => /^[a-zA-Z0-9_-]{1,64}$/.test(n))).toBe(true);
    const read = tools.find((x) => x.name === 'intake_handoverCard_read');
    expect([read?.annotations?.readOnlyHint, read?.inputSchema.type]).toEqual([true, 'object']);
    expect(tools.find((x) => x.name === 'intake_handoverCard_save')?.annotations?.readOnlyHint).toBe(false);
  });

  it('a write goes through the kernel: validated, ruled, audited as done via MCP', async () => {
    const content = { identification: { projectName: 'Counting', projectType: 'new' } };
    const saved = await call('intake_handoverCard_save', {
      siteId,
      content,
      items: [{ code: 'A1', status: 'provided', value: 'PO in folder' }],
      installsOrConfigures: true,
      newClientOrPlace: true,
    });
    expect(saved.isError).toBeFalsy();
    expect(body(saved)).toMatchObject({ version: 1, package: 'full' });
    expect(
      await countRows(testDb.url, `audit_event WHERE command = $1 AND source = 'mcp'`, [
        saveHandoverCard.name,
      ]),
    ).toBe(1);
  });

  it('SOP refusals and bad input come back as tool errors the agent can explain, not crashes', async () => {
    const refused = await call('intake_handoverCard_submit', { siteId });
    expect([refused.isError, body(refused).error]).toEqual([true, 'rule_violation']);
    expect(String(body(refused).message)).toMatch(/SOP-DEL-01 §6/);
    const bad = await call('intake_handoverCard_save', { siteId: 'not-a-uuid' });
    expect([bad.isError, body(bad).error]).toEqual([true, 'validation_failed']);
    expect((await call('intake_review_decide', { siteId })).isError).toBe(true);
  });
});
