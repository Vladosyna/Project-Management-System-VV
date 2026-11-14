// lifecycle repository — the only place in this module that touches tables.
import { and, eq, gateTemplate, isNull, or, site, siteStep, type Tx } from '@ocs/db';

/** The active project, locked until the transaction ends, with what the life cycle needs. */
export async function lockActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({
        id: site.id,
        clientId: site.clientId,
        programmeId: site.programmeId,
        standard: site.standard,
        countryCode: site.countryCode,
        plannedInstallationDate: site.plannedInstallationDate,
        gateTemplateId: site.gateTemplateId,
      })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
      .for('update')
  )[0];
}

export async function findActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({
        id: site.id,
        clientId: site.clientId,
        programmeId: site.programmeId,
        countryCode: site.countryCode,
        plannedInstallationDate: site.plannedInstallationDate,
        gateTemplateId: site.gateTemplateId,
      })
      .from(site)
      .where(and(eq(site.id, id), isNull(site.archivedAt)))
  )[0];
}

export async function activeSteps(tx: Tx, siteId: string) {
  return tx
    .select({
      id: siteStep.id,
      step: siteStep.step,
      doneOn: siteStep.doneOn,
      actorId: siteStep.actorId,
      evidence: siteStep.evidence,
      note: siteStep.note,
    })
    .from(siteStep)
    .where(and(eq(siteStep.siteId, siteId), isNull(siteStep.archivedAt)))
    .orderBy(siteStep.doneOn);
}

export async function insertStep(tx: Tx, row: typeof siteStep.$inferInsert): Promise<void> {
  await tx.insert(siteStep).values(row);
}

export async function setPlannedInstallation(tx: Tx, id: string, date: string): Promise<void> {
  await tx.update(site).set({ plannedInstallationDate: date }).where(eq(site.id, id));
}

export async function findTemplate(tx: Tx, id: string) {
  return (
    await tx
      .select({ id: gateTemplate.id, name: gateTemplate.name, gates: gateTemplate.gates })
      .from(gateTemplate)
      .where(and(eq(gateTemplate.id, id), isNull(gateTemplate.archivedAt)))
  )[0];
}

type TemplateRow = typeof gateTemplate.$inferSelect;

/**
 * D-32: the template a project takes — its own, else the most specific active scope among programme + country,
 * programme, client + country, client, base + country, base.
 */
export async function templateFor(
  tx: Tx,
  project: {
    clientId: string;
    programmeId: string | null;
    countryCode: string;
    gateTemplateId: string | null;
  },
) {
  if (project.gateTemplateId) return findTemplate(tx, project.gateTemplateId);
  const rows = await tx
    .select()
    .from(gateTemplate)
    .where(
      and(
        isNull(gateTemplate.archivedAt),
        or(isNull(gateTemplate.clientId), eq(gateTemplate.clientId, project.clientId)),
      ),
    );
  const score = (t: TemplateRow) => (t.programmeId ? 4 : 0) + (t.clientId ? 2 : 0) + (t.countryCode ? 1 : 0);
  const best = rows
    .filter(
      (t) =>
        (t.programmeId === null || t.programmeId === project.programmeId) &&
        (t.countryCode === null || t.countryCode === project.countryCode),
    )
    .sort((a, b) => score(b) - score(a))[0];
  return best ? { id: best.id, name: best.name, gates: best.gates } : undefined;
}

export interface GateScope {
  readonly clientId: string | null;
  readonly programmeId: string | null;
  readonly countryCode: string | null;
}

/** The active template of exactly this scope, locked. */
export async function lockScopeTemplate(tx: Tx, scope: GateScope) {
  const eqOrNull = (col: Parameters<typeof eq>[0], v: string | null) =>
    v === null ? isNull(col) : eq(col, v);
  return (
    await tx
      .select({ id: gateTemplate.id, name: gateTemplate.name, gates: gateTemplate.gates })
      .from(gateTemplate)
      .where(
        and(
          isNull(gateTemplate.archivedAt),
          eqOrNull(gateTemplate.clientId, scope.clientId),
          eqOrNull(gateTemplate.programmeId, scope.programmeId),
          eqOrNull(gateTemplate.countryCode, scope.countryCode),
        ),
      )
      .for('update')
  )[0];
}

export async function insertTemplate(tx: Tx, row: typeof gateTemplate.$inferInsert): Promise<void> {
  await tx.insert(gateTemplate).values(row);
}

/** Archive, never delete (SOP-DEL-02). */
export async function archiveTemplate(tx: Tx, id: string, at: Date): Promise<boolean> {
  const done = await tx
    .update(gateTemplate)
    .set({ archivedAt: at })
    .where(and(eq(gateTemplate.id, id), isNull(gateTemplate.archivedAt)))
    .returning({ id: gateTemplate.id });
  return done.length > 0;
}

export async function activeTemplates(tx: Tx) {
  return tx
    .select({
      id: gateTemplate.id,
      clientId: gateTemplate.clientId,
      programmeId: gateTemplate.programmeId,
      countryCode: gateTemplate.countryCode,
      name: gateTemplate.name,
      gates: gateTemplate.gates,
      createdAt: gateTemplate.createdAt,
    })
    .from(gateTemplate)
    .where(isNull(gateTemplate.archivedAt))
    .orderBy(gateTemplate.name);
}
