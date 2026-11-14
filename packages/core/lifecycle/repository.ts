// lifecycle repository — the only place in this module that touches tables.
import { and, eq, gateTemplate, isNull, site, siteStep, type Tx } from '@ocs/db';

/** The active project, locked until the transaction ends, with what the life cycle needs. */
export async function lockActiveSite(tx: Tx, id: string) {
  return (
    await tx
      .select({
        id: site.id,
        clientId: site.clientId,
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
