// HTTP API (ADR-001 P-03). Thin: session → actor → core command/query → JSON. No business logic here.
import { Hono } from 'hono';
import type { Actor } from '@ocs/contracts';
import { inviteUser, me } from '@ocs/core/identity';
import { clientList, siteList } from '@ocs/core/org';
import {
  addComment,
  commentToAction,
  openActions,
  projectFeed,
  recordVisit,
  staffList,
} from '@ocs/core/work';
import type { Runtime } from '@ocs/core/runtime';
import { errorResponse } from './errors.ts';

interface Env {
  Variables: { actor: Actor };
}

export function createApp(rt: Runtime): Hono {
  const app = new Hono();
  app.onError((err, c) => errorResponse(err, c));

  // better-auth: sign-in, sign-out, session, TOTP, passkeys. Direct sign-up is refused (invitation only).
  app.on(['GET', 'POST'], '/api/auth/*', (c) => rt.auth.handler(c.req.raw));

  app.post('/api/invitations/accept', async (c) => {
    const { userId, headers } = await rt.identity.acceptInvitation(await c.req.json(), c.req.raw.headers);
    const res = c.json({ userId }, 201);
    for (const cookie of headers.getSetCookie()) res.headers.append('set-cookie', cookie);
    return res;
  });

  // Everything else needs a signed-in, unarchived user with MFA set up.
  const api = new Hono<Env>();
  api.use('*', async (c, next) => {
    const session = await rt.auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: 'unauthenticated' }, 401);
    if (session.user.twoFactorEnabled !== true) {
      return c.json({ error: 'mfa_required', message: 'Set up two-factor authentication first' }, 403);
    }
    const actor = await rt.identity.loadActor(session.user.id);
    if (!actor) return c.json({ error: 'unauthenticated' }, 401);
    c.set('actor', actor);
    await next();
    return undefined;
  });

  api.get('/me', async (c) => c.json(await rt.kernel.read(me, c.get('actor'), {})));

  api.post('/users/invitations', async (c) => {
    const result = await rt.kernel.execute(inviteUser, c.get('actor'), await c.req.json(), 'web');
    // The token travels in the URL fragment, so it never reaches server or proxy logs.
    const link = `${rt.baseURL}/accept-invitation#${result.token}`;
    return c.json({ invitationId: result.invitationId, expiresAt: result.expiresAt, link }, 201);
  });

  // E1: what the actor may see of clients and sites (RLS limits the rows).
  api.get('/clients', async (c) => c.json(await rt.kernel.read(clientList, c.get('actor'), {})));
  api.get('/sites', async (c) => {
    const clientId = c.req.query('clientId');
    return c.json(await rt.kernel.read(siteList, c.get('actor'), clientId ? { clientId } : {}));
  });

  // E5: open actions, all or the actor's own (?mine=true), optionally of one project (?siteId=).
  api.get('/actions', async (c) => {
    const siteId = c.req.query('siteId');
    const mine = c.req.query('mine') === 'true';
    return c.json(await rt.kernel.read(openActions, c.get('actor'), { ...(siteId ? { siteId } : {}), mine }));
  });

  // E5 AC4: a project's feed — actions, comments, visit records with their sources (?before= to page).
  api.get('/sites/:siteId/feed', async (c) => {
    const before = c.req.query('before');
    return c.json(
      await rt.kernel.read(projectFeed, c.get('actor'), {
        siteId: c.req.param('siteId'),
        ...(before ? { before } : {}),
      }),
    );
  });

  // E5 AC2: comment on a project, @mentioning active staff (the list comes from /staff).
  api.get('/staff', async (c) => c.json(await rt.kernel.read(staffList, c.get('actor'), {})));
  api.post('/sites/:siteId/comments', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const input = { ...body, siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(addComment, c.get('actor'), input, 'web'), 201);
  });

  // E5 AC2 "turn into action": an action with an owner and a due date, linked to the comment.
  api.post('/comments/:commentId/action', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const input = { ...body, commentId: c.req.param('commentId') };
    return c.json(await rt.kernel.execute(commentToAction, c.get('actor'), input, 'web'), 201);
  });

  // E5 AC3: the same-day visit record with its action items (SOP-DEL-03 §5.1).
  api.post('/sites/:siteId/visits', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const input = { ...body, siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(recordVisit, c.get('actor'), input, 'web'), 201);
  });

  app.route('/api', api);
  return app;
}
