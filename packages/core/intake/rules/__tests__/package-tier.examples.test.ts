// SOP-DEL-01 §3 — examples: project → Full or Light, including the boundary cases (ocs-sop-rule §3).
import { describe, expect, it } from 'vitest';
import { decidePackageTier, type PackageTierInput } from '../package-tier.ts';
import { packageTierRule } from '../package-tier.config.ts';

const base = { siteFolderAccepted: true, installsOrConfigures: false, newClientOrPlace: false };
const examples: { name: string; input: PackageTierInput; tier: 'full' | 'light' }[] = [
  {
    name: 'POC is always Full, even on an accepted site',
    input: { ...base, projectType: 'poc' },
    tier: 'full',
  },
  { name: 'POC → rollout', input: { ...base, projectType: 'poc_to_rollout' }, tier: 'full' },
  { name: 'new project', input: { ...base, projectType: 'new' }, tier: 'full' },
  { name: 'expansion (rollout)', input: { ...base, projectType: 'expansion' }, tier: 'full' },
  { name: 'supply only, nothing installed', input: { ...base, projectType: 'supply_only' }, tier: 'light' },
  {
    name: 'supply with configuration',
    input: { ...base, projectType: 'supply_only', installsOrConfigures: true },
    tier: 'full',
  },
  {
    name: 'supply to a new city',
    input: { ...base, projectType: 'supply_only', newClientOrPlace: true },
    tier: 'full',
  },
  {
    name: 'add-points, accepted site, no installation',
    input: { ...base, projectType: 'add_points' },
    tier: 'light',
  },
  {
    name: 'add-points, folder not accepted',
    input: { ...base, projectType: 'add_points', siteFolderAccepted: false },
    tier: 'full',
  },
  {
    name: 'add-points with installation — stricter reading',
    input: { ...base, projectType: 'add_points', installsOrConfigures: true },
    tier: 'full',
  },
];

describe(`${packageTierRule.cite} package tier`, () => {
  it.each(examples)('$name → $tier', ({ input, tier }) => {
    const d = decidePackageTier(input);
    expect(d.tier).toBe(tier);
    expect(d.cite).toBe('SOP-DEL-01 §3');
  });
});
