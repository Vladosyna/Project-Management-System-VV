// Vionvision design tokens (03-engineering-rules §9). Values are copied exactly from the design
// system reference docs/ocs/reference/design-system/tokens.json; tokens.test.ts fails on any drift.
// This package is the only place in OCS where raw colours and font names may appear.

export interface ThemedColor {
  readonly light: string;
  readonly dark: string;
}

/** Brand colour tokens, name → value per theme. */
export const brandColors = {
  brand: { light: '#0066ff', dark: '#0066ff' },
  'brand-text': { light: '#005be6', dark: '#66a3ff' },
  'on-brand': { light: '#ffffff', dark: '#ffffff' },
  'brand-tint': { light: '#dce9f5', dark: '#16345a' },
  navy: { light: '#0c1b2b', dark: '#0c1b2b' },
  'on-navy-accent': { light: '#66a3ff', dark: '#66a3ff' },
  surface: { light: '#ffffff', dark: '#0c1b2b' },
  'surface-alt': { light: '#f0f1f6', dark: '#14273b' },
  'table-head': { light: '#f2f2f2', dark: '#1a2e44' },
  ink: { light: '#000000', dark: '#ffffff' },
  'ink-muted': { light: '#666666', dark: '#a9b4c2' },
  'ink-subtle': { light: '#6e6e6e', dark: '#95a1af' },
  rule: { light: '#d9d9d9', dark: '#2a3d52' },
  'success-tint': { light: '#e3f1e4', dark: '#173a26' },
  'success-ink': { light: '#1f7a3a', dark: '#7fd19a' },
  'warning-tint': { light: '#fcefd9', dark: '#3d2e12' },
  'warning-ink': { light: '#9a5b00', dark: '#f2b766' },
  'neutral-tint': { light: '#f2f2f2', dark: '#1a2e44' },
  'accent-orange': { light: '#fe9454', dark: '#fe9454' },
  'chart-1': { light: '#0066ff', dark: '#0066ff' },
  'chart-2': { light: '#0c1b2b', dark: '#e6ecf3' },
  'chart-3': { light: '#99c2ff', dark: '#99c2ff' },
  'chart-4': { light: '#8d8d8d', dark: '#7f8b99' },
  'chart-5': { light: '#d46b2a', dark: '#fe9454' },
} as const satisfies Record<string, ThemedColor>;

/**
 * OCS extensions, not in the brand system: the SLA-breach status used by the case mockups.
 * Always shown with a word, never colour alone. danger-ink on danger-tint: 5.37:1 (tokens.test.ts).
 */
export const extensionColors = {
  'danger-tint': { light: '#fde2e1', dark: '#4a1b1a' },
  'danger-ink': { light: '#b42318', dark: '#ffb4ab' },
} as const satisfies Record<string, ThemedColor>;

export const colors = { ...brandColors, ...extensionColors };
export type ColorToken = keyof typeof colors;

export const fontFamilies = {
  display: '"Alibaba PuHuiTi 3.0", "Alibaba PuHuiTi", Arial, "Microsoft YaHei", "PingFang SC", sans-serif',
  sans: 'Arial, "Liberation Sans", "Microsoft YaHei", "PingFang SC", sans-serif',
} as const;

export interface TypeStyle {
  readonly family: keyof typeof fontFamilies;
  readonly fontSize: string;
  readonly lineHeight: string;
  readonly fontWeight: number;
}

export const typeStyles = {
  'slide-display': { family: 'display', fontSize: '88px', lineHeight: '96px', fontWeight: 500 },
  'slide-title': { family: 'display', fontSize: '56px', lineHeight: '64px', fontWeight: 500 },
  'slide-body': { family: 'display', fontSize: '32px', lineHeight: '44px', fontWeight: 400 },
  eyebrow: { family: 'display', fontSize: '28px', lineHeight: '36px', fontWeight: 400 },
  'stat-figure': { family: 'display', fontSize: '96px', lineHeight: '104px', fontWeight: 500 },
  'doc-title': { family: 'sans', fontSize: '21px', lineHeight: '26px', fontWeight: 700 },
  h1: { family: 'sans', fontSize: '17px', lineHeight: '22px', fontWeight: 700 },
  h2: { family: 'sans', fontSize: '14px', lineHeight: '19px', fontWeight: 700 },
  body: { family: 'sans', fontSize: '13px', lineHeight: '19px', fontWeight: 400 },
  small: { family: 'sans', fontSize: '11px', lineHeight: '15px', fontWeight: 400 },
} as const satisfies Record<string, TypeStyle>;

export const space = {
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-6': '24px',
  'space-8': '32px',
  'space-12': '48px',
  'space-16': '64px',
} as const;

export const radius = {
  'radius-0': '0px',
  'radius-sm': '5px',
  'radius-md': '8px',
  'radius-pill': '3.2rem',
} as const;

export const shadow = {
  'shadow-card': '0px 0px 35px 0 rgba(0,0,0,0.08)',
  'shadow-brand-glow': '0px 0px 15px 0 rgba(0,102,255,0.4)',
} as const;

export const motif = {
  'slash-angle': '-30deg',
} as const;
