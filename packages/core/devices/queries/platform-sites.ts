// devices.platformSites.read — the projects the device platform job works on: active, linked to a mall
// (site.platform_ref), with the alerts checkbox (site.device_alerts_enabled). System only.
import { z } from 'zod';
import { defineQuery } from '../../kernel/index.ts';
import { devicesPermissions } from '../permissions.ts';
import { platformLinkedSites } from '../repository.ts';

export interface PlatformSite {
  readonly siteId: string;
  readonly projectId: string;
  /** The mall's plazaUnid on the device platform. */
  readonly platformRef: string;
  readonly alertsEnabled: boolean;
}

export const platformSites = defineQuery({
  name: 'devices.platformSites.read',
  permission: devicesPermissions.platformSites,
  input: z.object({}),
  handle: async (ctx): Promise<PlatformSite[]> =>
    (await platformLinkedSites(ctx.tx)).flatMap((s) =>
      s.platformRef === null ? [] : [{ ...s, platformRef: s.platformRef }],
    ),
});
