// SOP-DEL-01 §3 — evaluator. Reads only ./package-tier.config.ts. Decides Full or Light; never throws.
import type { projectTypes } from '@ocs/contracts';
import { packageTierRule } from './package-tier.config.ts';

export interface PackageTierInput {
  readonly projectType: (typeof projectTypes)[number];
  /** The site's project folder has already been accepted in an earlier intake (§3 "work on a site whose…"). */
  readonly siteFolderAccepted: boolean;
  /** VionVision installs or configures anything in this project. */
  readonly installsOrConfigures: boolean;
  /** A new client, or a new country or city for an existing client (§3 "Full package"). */
  readonly newClientOrPlace: boolean;
}

export interface PackageTierDecision {
  readonly tier: 'full' | 'light';
  readonly cite: string;
  /** Plain reason for the screen and the audit record. */
  readonly reason: string;
}

export function decidePackageTier(i: PackageTierInput): PackageTierDecision {
  const r = packageTierRule;
  const full = (reason: string): PackageTierDecision => ({ tier: 'full', cite: r.cite, reason });
  if ((r.alwaysFull as readonly string[]).includes(i.projectType))
    return full(`${i.projectType} is always Full`);
  if (i.newClientOrPlace) return full('new client, country or city');
  if (i.projectType === 'supply_only') {
    return i.installsOrConfigures
      ? full('supply with installation or configuration by VionVision')
      : { tier: 'light', cite: r.cite, reason: 'supply only, no installation or configuration' };
  }
  // add_points
  if (!i.siteFolderAccepted) return full('the site has no accepted project folder yet');
  if (i.installsOrConfigures && !r.addPointsWithInstallationIsLight) {
    return full('add-points with installation (stricter reading of §3)');
  }
  return { tier: 'light', cite: r.cite, reason: 'add-points on a site whose folder is accepted' };
}
