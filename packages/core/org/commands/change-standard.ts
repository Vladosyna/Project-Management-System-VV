// org.site.changeStandard — E1 AC3: staff change a site's standard both ways, S → L and L → S (D-25, which
// overrides the SOP-DEL-02 §2.1 "no downgrade" sentence). The Project ID never changes (D-18). Until the
// DingTalk Drive integration the PM moves the folders by hand.
import { z } from 'zod';
import { Conflict, defineCommand, NotFound } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { lockActiveSite, setSiteStandard } from '../repository.ts';

export const changeStandard = defineCommand({
  name: 'org.site.changeStandard',
  permission: orgPermissions.changeStandard,
  input: z.object({ siteId: z.uuid(), standard: z.enum(['L', 'S']) }),
  describe: (i) => `Change the standard of site ${i.siteId} to ${i.standard}`,
  handle: async (ctx, i) => {
    const current = await lockActiveSite(ctx.tx, i.siteId);
    if (!current) throw new NotFound('site', i.siteId);
    if (current.standard === i.standard) {
      throw new Conflict(`Site ${current.projectId} already has standard ${i.standard}`);
    }
    await setSiteStandard(ctx.tx, current.id, i.standard);
    ctx.emit(
      'org.site.standardChanged',
      { siteId: current.id, projectId: current.projectId, from: current.standard, to: i.standard },
      current.clientId,
    );
    return {
      result: { projectId: current.projectId, standard: i.standard },
      audit: {
        objectType: 'site',
        objectId: current.id,
        clientId: current.clientId,
        before: { standard: current.standard },
        after: { standard: i.standard },
      },
    };
  },
});
