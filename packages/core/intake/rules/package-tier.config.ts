// SOP-DEL-01 §3 — which handover package a project needs:
//   "Full package: new clients; new countries or cities for an existing client; any project with installation;
//    rollouts; POCs; POC-to-rollout conversions. POCs are always Full."
//   "Light package: work on a site whose project folder has already been accepted (add-points, replacements,
//    warranty extensions), and supply-only orders with no installation or configuration by VionVision."
// The evaluator reads only this config. A new SOP version updates this file (sop-index.md).
export const packageTierRule = {
  cite: 'SOP-DEL-01 §3',
  sopVersion: '1.3',
  /** Always Full, whatever else is true ("POCs are always Full"; new clients; rollouts). */
  alwaysFull: ['new', 'poc', 'poc_to_rollout', 'expansion'],
  /** Light candidates; Light only when the conditions below hold, otherwise Full. */
  lightCandidates: ['add_points', 'supply_only'],
  /**
   * Ambiguity, open question to Vlad: §3 names add-points as Light, but also says "any project with
   * installation" is Full, and add-points are installed. Stricter reading by default (false → Full when
   * VionVision installs or configures); true follows the add-points example literally.
   */
  addPointsWithInstallationIsLight: false as boolean,
} as const;
