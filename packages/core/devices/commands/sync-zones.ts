// devices.platform.syncZones — E4: one project's zones as the device platform names them (07-integrations: site =
// mall; zones = its stores/areas and gates). Vlad, 4 Nov: names and categories changed on the platform are taken
// over in OCS. Runs as the system actor from the worker; the adapter never writes tables (ocs-integration §3).
// - Zones match on the platform ref. A new ref is added; a changed name, kind or entrance type (mall entrance vs
//   store entrance, the platform's isMallGate) is updated, and the change is listed in the result.
// - A zone the platform no longer lists is archived, never deleted (SOP-DEL-02).
// Idempotent: the same snapshot twice changes nothing more.
import { z } from 'zod';
import { Conflict, defineCommand, NotFound } from '../../kernel/index.ts';
import { devicesPermissions } from '../permissions.ts';
import { activeZonesOf, archiveZones, findPlatformSite, insertZones, updateZone } from '../repository.ts';

const text = (max: number) => z.string().trim().min(1).max(max);

export const syncZones = defineCommand({
  name: 'devices.platform.syncZones',
  permission: devicesPermissions.syncZones,
  input: z.object({
    siteId: z.uuid(),
    zones: z
      .array(
        z.object({
          ref: text(100),
          kind: z.enum(['area', 'gate']),
          name: text(200),
          /** Gates only: on the mall's outer boundary. */
          entrance: z.boolean().default(false),
        }),
      )
      .max(2000)
      .refine((zs) => new Set(zs.map((zn) => zn.ref)).size === zs.length, 'a zone ref appears twice'),
  }),
  describe: (i) => `Sync ${String(i.zones.length)} zones from the platform`,
  handle: async (ctx, i) => {
    const project = await findPlatformSite(ctx.tx, i.siteId);
    if (!project) throw new NotFound('site', i.siteId);
    if (project.platformRef === null)
      throw new Conflict('this project is not linked to a mall on the platform');

    const known = new Map((await activeZonesOf(ctx.tx, project.id)).map((zn) => [zn.platformRef, zn]));
    const added: string[] = [];
    const changed: { ref: string; from: string; to: string }[] = [];
    const rows = [];
    for (const zn of i.zones) {
      const next = { kind: zn.kind, name: zn.name, entrance: zn.kind === 'gate' && zn.entrance };
      const was = known.get(zn.ref);
      if (!was) {
        rows.push({
          id: ctx.newId(),
          clientId: project.clientId,
          siteId: project.id,
          platformRef: zn.ref,
          ...next,
        });
        added.push(zn.ref);
        continue;
      }
      if (was.kind !== next.kind || was.name !== next.name || was.entrance !== next.entrance) {
        await updateZone(ctx.tx, was.id, next);
        const label = (v: typeof next) => `${v.name} (${v.kind}${v.entrance ? ', entrance' : ''})`;
        changed.push({ ref: zn.ref, from: label(was), to: label(next) });
      }
    }
    await insertZones(
      ctx.tx,
      rows.map((r) => ({ ...r, createdAt: ctx.now })),
    );
    const listed = new Set(i.zones.map((zn) => zn.ref));
    const gone = [...known.values()].filter((zn) => !listed.has(zn.platformRef));
    await archiveZones(
      ctx.tx,
      gone.map((zn) => zn.id),
      ctx.now,
    );

    const result = { added, changed, archived: gone.map((zn) => zn.platformRef) };
    return {
      result,
      audit: {
        objectType: 'site',
        objectId: project.id,
        clientId: project.clientId,
        before: null,
        after: result,
      },
    };
  },
});
