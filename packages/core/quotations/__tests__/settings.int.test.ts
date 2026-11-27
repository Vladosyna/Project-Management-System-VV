// Quotation settings and model prices (D-40, E15 AC1): a director sets them; saving again replaces the active row
// (archived, never deleted); a VAT rate only with DDP local VAT.
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { aStaffActor, countRows, createTestDatabase, type TestDatabase } from '@ocs/testing';
import { Forbidden, openTestKernel, ValidationFailed, type TestKernel } from '../../kernel/index.ts';
import { createClient } from '../../org/index.ts';
import { saveConfig } from '../commands/save-config.ts';
import { savePrice } from '../commands/save-price.ts';

const director = aStaffActor({ roles: ['director'] });
const pm = aStaffActor({ roles: ['pm'] });
let testDb: TestDatabase;
let t: TestKernel;
let clientId: string;
const config = (more: Record<string, unknown> = {}) => ({
  clientId,
  countryCode: 'ES',
  currency: 'EUR',
  hourlyRate: '193.60',
  taxMode: 'ddp_local_vat',
  vatRate: '21',
  seller: { name: 'Vionvision Entity A' },
  buyer: { name: 'Client A' },
  bank: { beneficiary: 'Vionvision Entity A' },
  terms: ['All devices carry a 3-year warranty.'],
  numberPrefix: 'QA',
  ...more,
});

beforeAll(async () => {
  testDb = await createTestDatabase(inject('postgresUrl'));
  t = await openTestKernel(testDb.url);
  t.grant(director, createClient.permission, saveConfig.permission, savePrice.permission);
  ({ id: clientId } = await t.kernel.execute(
    createClient,
    director,
    { shortCode: 'CLIENTA', name: 'Client A' },
    'test',
  ));
});

afterAll(async () => {
  await t.close();
  await testDb.drop();
});

describe('quotation settings and prices', () => {
  it('only a director sets them', async () => {
    await expect(t.kernel.execute(saveConfig, pm, config(), 'test')).rejects.toBeInstanceOf(Forbidden);
  });

  it('a VAT rate only with DDP local VAT', async () => {
    await expect(
      t.kernel.execute(saveConfig, director, config({ taxMode: 'reverse_charge' }), 'test'),
    ).rejects.toBeInstanceOf(ValidationFailed);
    await expect(
      t.kernel.execute(saveConfig, director, config({ vatRate: undefined }), 'test'),
    ).rejects.toBeInstanceOf(ValidationFailed);
  });

  it('saving again replaces the active settings and price; the old rows are archived', async () => {
    await t.kernel.execute(saveConfig, director, config(), 'test');
    await t.kernel.execute(saveConfig, director, config({ hourlyRate: '200.00' }), 'test');
    const price = { clientId, model: 'Sensor model A', unitPrice: '1270.50', currency: 'EUR' };
    await t.kernel.execute(savePrice, director, price, 'test');
    await t.kernel.execute(savePrice, director, { ...price, unitPrice: '1300.00' }, 'test');
    expect(
      await countRows(testDb.url, `client_quote_config WHERE archived_at IS NULL AND hourly_rate = 200`),
    ).toBe(1);
    expect(await countRows(testDb.url, 'client_quote_config WHERE archived_at IS NOT NULL')).toBe(1);
    expect(await countRows(testDb.url, `sensor_price WHERE archived_at IS NULL AND unit_price = 1300`)).toBe(
      1,
    );
  });
});
