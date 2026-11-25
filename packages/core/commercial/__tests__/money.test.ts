// Exact EUR conversion (D-34 N2, "original + euro").
import { describe, expect, it } from 'vitest';
import { isAmount, isRate, toEur } from '../rules/money.ts';

describe('money', () => {
  it('converts exactly and rounds half up to cents', () => {
    expect(toEur('1200.00', '1.160000')).toBe('1392.00');
    expect(toEur('0.01', '0.5')).toBe('0.01');
    expect(toEur('10', '0.123456')).toBe('1.23');
    expect(toEur('999999999999.99', '1')).toBe('999999999999.99');
  });

  it('accepts amounts with 2 decimals and positive rates with 6', () => {
    expect([isAmount('12.34'), isAmount('12.345'), isAmount('-1')]).toEqual([true, false, false]);
    expect([isRate('1.1234567'), isRate('0'), isRate('4.25')]).toEqual([false, false, true]);
  });
});
