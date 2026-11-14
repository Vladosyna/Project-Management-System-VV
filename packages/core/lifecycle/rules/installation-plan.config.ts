// SOP-DEL-04 §1 — "No completed Site Information Card, no installation date. Delivery does not schedule installers
// or promise dates against a site it knows only from a proposal." Also E3 AC1/AC4: the base steps in order, and
// the acceptance evidence by standard. The evaluators read only this config.
export const installationPlanRule = {
  cite: 'SOP-DEL-04 §1',
  sopVersion: '1.0',
  /** The step that must be reached before an installation date may be set. */
  requiredStep: 'card_complete',
  /** E3 AC1: the base steps, in order. A step needs the one before it (gates are free-standing). */
  baseSteps: [
    'card_received',
    'card_complete',
    'readiness_confirmed',
    'go_no_go',
    'installed',
    'accepted',
  ] as const,
  /** E3 AC4: acceptance needs its evidence — S: Installation Acceptance Form, L: Acceptance Certificate. */
  acceptanceEvidence: { S: 'Installation Acceptance Form', L: 'Acceptance Certificate' } as const,
} as const;
