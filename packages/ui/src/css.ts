// Renders the design tokens as CSS custom properties. The output is committed as styles/tokens.css
// (`pnpm --filter @ocs/ui gen:tokens`); tokens.test.ts fails when the file is stale.
import { colors, fontFamilies, motif, radius, shadow, space, typeStyles } from './tokens.ts';

/** Sidebar on navy (the mockups' nav): text and hover come from the dark theme of the same tokens. */
const navTokens = {
  'nav-bg': colors.navy.light,
  'nav-hover': colors['surface-alt'].dark,
  'nav-text': '#c9d3df', // mockup nav link colour on navy (11.49:1), not in the brand token set
  'nav-muted': colors['ink-muted'].dark,
  'nav-rule': colors.rule.dark,
  'nav-accent': colors['on-navy-accent'].light,
} as const;

export function renderTokensCss(): string {
  const lines = ['/* Generated from packages/ui/src/tokens.ts — do not edit. */', ':root {'];
  for (const [name, value] of Object.entries(colors)) lines.push(`  --ocs-${name}: ${value.light};`);
  for (const [name, value] of Object.entries(navTokens)) lines.push(`  --ocs-${name}: ${value};`);
  for (const [name, value] of Object.entries(fontFamilies)) lines.push(`  --ocs-font-${name}: ${value};`);
  for (const [name, style] of Object.entries(typeStyles)) {
    lines.push(`  --ocs-type-${name}-size: ${style.fontSize};`);
    lines.push(`  --ocs-type-${name}-line: ${style.lineHeight};`);
    lines.push(`  --ocs-type-${name}-weight: ${String(style.fontWeight)};`);
  }
  for (const group of [space, radius, shadow, motif]) {
    for (const [name, value] of Object.entries(group)) lines.push(`  --ocs-${name}: ${value};`);
  }
  lines.push('}', '');
  return lines.join('\n');
}
