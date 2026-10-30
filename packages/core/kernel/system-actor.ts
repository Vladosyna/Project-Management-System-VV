import type { Actor } from '@ocs/contracts';

/** Fixed id of the system actor in audit records. */
export const SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-000000000000';

/** The actor integrations and internal flows act as. `via` names the flow in audit, e.g. "identity". */
export function systemActor(via: string): Actor {
  return { id: SYSTEM_ACTOR_ID, kind: 'system', clientIds: [], roles: ['system'], via };
}
