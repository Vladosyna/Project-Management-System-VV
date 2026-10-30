// Anonymised factories (04-testing §7). Names are labels only — Client A, Partner A, Site 001 — never
// real client, partner or person names (CLAUDE.md §3 rule 3). Entity factories for business tables are
// added with their modules (pnpm gen:module).
import { randomUUID } from 'node:crypto';
import type { Actor } from '@ocs/contracts';

const letter = (index: number): string => {
  if (!Number.isInteger(index) || index < 0 || index > 25)
    throw new Error(`Label index 0–25, got ${String(index)}`);
  return String.fromCharCode(65 + index);
};

/** "Client A", "Client B", … */
export const clientLabel = (index: number): string => `Client ${letter(index)}`;
/** "Partner A", … — the same labels clients see (CLAUDE.md §3 rule 5). */
export const partnerLabel = (index: number): string => `Partner ${letter(index)}`;
/** "Site 001", … */
export const siteLabel = (n: number): string => `Site ${String(n).padStart(3, '0')}`;
/** "Person 01", … for staff and contacts. */
export const personLabel = (n: number): string => `Person ${String(n).padStart(2, '0')}`;

export function aStaffActor(overrides: Partial<Actor> = {}): Actor {
  return { id: randomUUID(), kind: 'staff', clientIds: [], roles: ['pm'], ...overrides };
}

export function aClientActor(clientId: string, overrides: Partial<Actor> = {}): Actor {
  return { id: randomUUID(), kind: 'client', clientIds: [clientId], roles: ['client'], ...overrides };
}

export function aPartnerActor(clientIds: readonly string[], overrides: Partial<Actor> = {}): Actor {
  return { id: randomUUID(), kind: 'partner', clientIds, roles: ['partner'], ...overrides };
}

export function aSystemActor(overrides: Partial<Actor> = {}): Actor {
  return { id: randomUUID(), kind: 'system', clientIds: [], roles: ['system'], ...overrides };
}
