// org.partner.assign — E1 AC4: a partner starts working for a client under the next free letter of that
// client ("Partner A", "Partner B" …). Letters are per client, in order of assignment, never reused.
import { z } from 'zod';
import { Conflict, defineCommand, NotFound } from '../../kernel/index.ts';
import { orgPermissions } from '../permissions.ts';
import { clientAssignments, findActivePartner, insertAssignment, lockActiveClient } from '../repository.ts';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A–Z

export const assignPartner = defineCommand({
  name: 'org.partner.assign',
  permission: orgPermissions.assignPartner,
  input: z.object({ clientId: z.uuid(), partnerId: z.uuid() }),
  describe: (i) => `Assign partner ${i.partnerId} to client ${i.clientId}`,
  handle: async (ctx, i) => {
    const owner = await lockActiveClient(ctx.tx, i.clientId);
    if (!owner) throw new NotFound('client', i.clientId);
    if (!(await findActivePartner(ctx.tx, i.partnerId))) throw new NotFound('partner', i.partnerId);
    const taken = await clientAssignments(ctx.tx, owner.id);
    if (taken.some((a) => a.partnerId === i.partnerId)) {
      throw new Conflict(`The partner already works for client ${owner.shortCode}`);
    }
    const letter = LETTERS.find((l) => !taken.some((a) => a.letter === l));
    if (!letter)
      throw new Conflict(`Client ${owner.shortCode} has used all ${String(LETTERS.length)} partner letters`);
    const row = { id: ctx.newId(), clientId: owner.id, partnerId: i.partnerId, letter };
    await insertAssignment(ctx.tx, { ...row, createdAt: ctx.now });
    ctx.emit('org.partner.assigned', { assignmentId: row.id, letter }, owner.id);
    return {
      result: { label: `Partner ${letter}` },
      audit: {
        objectType: 'partner_assignment',
        objectId: row.id,
        clientId: owner.id,
        before: null,
        after: row,
      },
    };
  },
});
