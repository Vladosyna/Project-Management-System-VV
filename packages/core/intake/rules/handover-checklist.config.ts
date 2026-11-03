// SOP-DEL-01 §6 — "Handover Package — Mandatory Content". "Yes = mandatory. If appl. = mandatory when it exists;
// otherwise mark N/A with a reason. Changes = only what differs from the existing folder. — = not required."
// Columns Full | Light, transcribed from the table of v1.3. Blocking items from §8: "Blocking items — A1, A4, A6,
// C2, D1, F1 — can never be conditional." The evaluator reads only this config.
type Need = 'yes' | 'if_appl' | 'changes' | 'none';

export const handoverChecklistRule = {
  cite: 'SOP-DEL-01 §6',
  sopVersion: '1.3',
  items: {
    A1: { full: 'yes', light: 'yes' }, // Signed contract / PO / SOW
    A2: { full: 'yes', light: 'yes' }, // Final quotation and bill of quantities
    A3: { full: 'yes', light: 'if_appl' }, // Cost split
    A4: { full: 'yes', light: 'yes' }, // Committed dates
    A5: { full: 'yes', light: 'none' }, // Warranty, SLA, support
    A6: { full: 'yes', light: 'if_appl' }, // Acceptance criteria
    A7: { full: 'yes', light: 'if_appl' }, // Payment milestones tied to delivery
    A8: { full: 'yes', light: 'if_appl' }, // Exclusions
    B1: { full: 'yes', light: 'changes' }, // Decision maker and project owner
    B2: { full: 'yes', light: 'changes' }, // Day-to-day contact
    B3: { full: 'if_appl', light: 'if_appl' }, // Third parties
    B4: { full: 'yes', light: 'yes' }, // VionVision side
    C1: { full: 'yes', light: 'yes' }, // Site list
    C2: { full: 'yes', light: 'changes' }, // Site Information Card (CIP-L or CIP-S)
    C3: { full: 'yes', light: 'if_appl' }, // Point design
    C4: { full: 'yes', light: 'if_appl' }, // Platform and integration as sold
    C5: { full: 'yes', light: 'if_appl' }, // Security and privacy commitments
    C6: { full: 'if_appl', light: 'none' }, // POC and survey results
    D1: { full: 'yes', light: 'yes' }, // Gap list
    D2: { full: 'if_appl', light: 'if_appl' }, // Promised customisations, demos, trials
    D3: { full: 'yes', light: 'if_appl' }, // What the card does not cover
    E1: { full: 'yes', light: 'changes' }, // Language and channel
    E2: { full: 'yes', light: 'none' }, // Contact hours and time zone
    E3: { full: 'yes', light: 'changes' }, // CC and approval rules
    E4: { full: 'yes', light: 'if_appl' }, // Sensitivities
    E5: { full: 'yes', light: 'if_appl' }, // Escalation path and rhythm
    E6: { full: 'yes', light: 'if_appl' }, // Key correspondence
    F1: { full: 'yes', light: 'yes' }, // Verbal commitments (restricted Internal Notes)
    F2: { full: 'yes', light: 'if_appl' }, // Concessions
    F3: { full: 'yes', light: 'if_appl' }, // Relationship map
    F4: { full: 'if_appl', light: 'if_appl' }, // History
    F5: { full: 'yes', light: 'yes' }, // Relationship health
    G1: { full: 'yes', light: 'yes' }, // Open questions, pending approvals, known blockers
  } satisfies Record<string, { full: Need; light: Need }>,
  /** §8: never a condition of acceptance. */
  blocking: ['A1', 'A4', 'A6', 'C2', 'D1', 'F1'],
} as const;
