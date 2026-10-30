import { z } from 'zod';

/** Internal staff roles (F0.8, agreed with the Delivery Director 30 Oct 2026). */
export const staffRoles = [
  'director', // Delivery Director: intake review, portfolio, escalations, acceptance
  'pm', // project managers
  'sales', // Handover Card, project ID, client pack
  'rnd', // platform, algorithm and firmware teams
  'finance', // PO / invoice readiness
  'management', // read-only portfolio and metrics
  'sponsor', // the only role that may authorise Conditional Start (SOP-DEL-01 §9)
  'admin', // user and role administration
] as const;

/** External roles — defined now, usable only after the independent security review (V1.1). */
export const externalRoles = ['client', 'partner'] as const;

/** Integrations and the central AI agent act as the system actor with this role. */
export const systemRoles = ['system'] as const;

export const roles = [...staffRoles, ...externalRoles, ...systemRoles] as const;
export const RoleSchema = z.enum(roles);
export type Role = z.infer<typeof RoleSchema>;
