// The UI tokens are the design system's (03-engineering-rules §9): exact values, generated CSS up to date,
// and text contrast that passes WCAG AA (4.5:1) on the grounds the UI puts it on.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { brandColors, colors, fontFamilies, radius, renderTokensCss, space, typeStyles } from '../index.ts';

interface RefToken {
  name: string;
  value: string | Record<string, string>;
}
const ref = JSON.parse(
  readFileSync(new URL('../../../../docs/ocs/reference/design-system/tokens.json', import.meta.url), 'utf8'),
) as {
  color: { tokens: RefToken[] };
  type: { families: Record<string, string>; groups: { styles: { name: string; fontSize: string }[] }[] };
  spacing: { tokens: RefToken[] };
  radius: { tokens: RefToken[] };
};

function resolve(value: RefToken['value']): Record<string, string> {
  if (typeof value === 'string' && value.startsWith('{')) {
    const target = ref.color.tokens.find((t) => t.name === value.slice(1, -1));
    if (!target) throw new Error(`Unknown alias ${value}`);
    return resolve(target.value);
  }
  return typeof value === 'string' ? { light: value, dark: value } : value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('matches the Vionvision design system reference', () => {
  it('every brand colour has exactly the reference value in both themes', () => {
    const expected = Object.fromEntries(ref.color.tokens.map((t) => [t.name, resolve(t.value)]));
    expect(brandColors).toEqual(expected);
  });

  it('fonts, type sizes, spacing and radii match', () => {
    expect(fontFamilies).toEqual(ref.type.families);
    const sizes = Object.fromEntries(
      ref.type.groups.flatMap((g) => g.styles.map((s) => [s.name, s.fontSize])),
    );
    expect(Object.fromEntries(Object.entries(typeStyles).map(([k, v]) => [k, v.fontSize]))).toEqual(sizes);
    expect(space).toEqual(Object.fromEntries(ref.spacing.tokens.map((t) => [t.name, t.value])));
    expect(radius).toEqual(Object.fromEntries(ref.radius.tokens.map((t) => [t.name, t.value])));
  });

  it('styles/tokens.css is generated from tokens.ts (run `pnpm --filter @ocs/ui gen:tokens`)', () => {
    const css = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');
    expect(css).toBe(renderTokensCss());
  });
});

describe('text contrast ≥ 4.5:1 where the UI uses it', () => {
  const c = (name: keyof typeof colors) => colors[name].light;
  const pairs: [string, string, string][] = [
    ['ink on surface', c('ink'), c('surface')],
    ['ink on surface-alt (page)', c('ink'), c('surface-alt')],
    ['ink-muted on surface (eyebrow, clocks)', c('ink-muted'), c('surface')],
    ['ink-muted on surface-alt', c('ink-muted'), c('surface-alt')],
    ['brand-text on surface (links, secondary button)', c('brand-text'), c('surface')],
    ['on-brand on brand (primary button, active nav)', c('on-brand'), c('brand')],
    ['nav text on navy', '#c9d3df', c('navy')],
    ['nav muted on navy (signed-in user)', colors['ink-muted'].dark, c('navy')],
    ['nav accent on navy (tagline)', c('on-navy-accent'), c('navy')],
    ['chip ok', c('success-ink'), c('success-tint')],
    ['chip progress', c('brand-text'), c('brand-tint')],
    ['chip risk', c('warning-ink'), c('warning-tint')],
    ['chip wait', c('ink'), c('neutral-tint')],
    ['chip breach', c('danger-ink'), c('danger-tint')],
    ['chip escalated', c('on-brand'), c('navy')],
  ];
  it.each(pairs)('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
