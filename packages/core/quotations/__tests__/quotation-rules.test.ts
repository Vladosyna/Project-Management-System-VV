// D-40/D-41/D-42 quotation arithmetic — the Spanish quotation and Vlad's five countries (27 Nov), to the cent.
import { describe, expect, it } from 'vitest';
import { grossUp, priced, standardHours, type Store } from '../rules/quotation.ts';

const full = (sensors: number, stores: number): Store[] =>
  Array.from({ length: stores }, (_, n) => ({
    scope: 'full',
    devices: [{ model: 'G6', count: Math.floor(sensors / stores) + (n < sensors % stores ? 1 : 0) }],
  }));
const total = (price: string, sensors: number, rate: string, hours: number) =>
  priced([
    { kind: 'device', label: 'G6', unitPrice: price, units: sensors },
    { kind: 'installation', label: 'Installation', unitPrice: rate, units: hours },
  ]).subtotal;

describe('time standard (D-40, D-42)', () => {
  it('partial N + 2, full 2N + 2 per store; N counts G6, G6S, G6 WiFi, B1 — not CBox', () => {
    expect(
      standardHours([
        {
          scope: 'full',
          devices: [
            { model: 'G6', count: 5 },
            { model: 'CBox', count: 1 },
          ],
        },
        {
          scope: 'partial',
          devices: [
            { model: 'B1', count: 1 },
            { model: 'G6S', count: 1 },
            { model: 'G6 WiFi', count: 1 },
          ],
        },
      ]),
    ).toBe(17);
  });

  it.each([
    ['ES', 33, 7, 80],
    ['GR', 85, 22, 214],
    ['CH', 21, 6, 54],
    ['BG', 25, 5, 60],
    ['RS', 6, 3, 18],
    ['SK', 18, 6, 48],
  ])('%s: %i sensors in %i stores, full → %i h', (_cc, sensors, stores, hours) => {
    expect(standardHours(full(sensors, stores))).toBe(hours);
  });
});

describe('DDP local VAT grosses up net prices (D-41)', () => {
  it('Spain 21 %, Serbia 20 %; reverse charge stays net', () => {
    expect([
      grossUp('1050', '21'),
      grossUp('160', '21'),
      grossUp('1050', '20'),
      grossUp('190', '20'),
    ]).toEqual(['1270.50', '193.60', '1260.00', '228.00']);
    expect(grossUp('1050', null)).toBe('1050.00');
  });
});

describe('totals to the cent', () => {
  it.each([
    ['ES (DDP 21 %, 78 h)', grossUp('1050', '21'), 33, grossUp('160', '21'), 78, '57027.30'],
    ['GR', '1050', 85, '160', 214, '123490.00'],
    ['CH', '1050', 21, '190', 50, '31550.00'],
    ['BG', '1050', 25, '160', 60, '35850.00'],
    ['RS (DDP 20 %)', grossUp('1050', '20'), 6, grossUp('190', '20'), 16, '11208.00'],
    ['SK', '1050', 18, '190', 46, '27640.00'],
  ])('%s', (_name, price, sensors, rate, hours, expected) => {
    expect(total(price, sensors, rate, hours)).toBe(expected);
  });
});
