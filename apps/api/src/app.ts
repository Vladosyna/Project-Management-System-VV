// HTTP API (ADR-001 P-03). Thin: session → actor → core command/query → JSON. No business logic here.
import { Hono } from 'hono';
import type { Actor } from '@ocs/contracts';
import { inviteUser, me } from '@ocs/core/identity';
import {
  authoriseConditionalStart,
  decideIntake,
  handoverCardView,
  intakeRegister,
  saveHandoverCard,
  submitHandoverCard,
} from '@ocs/core/intake';
import { recordFirmwareIssue, registerDevice, setVersions, siteDevices } from '@ocs/core/devices';
import {
  archiveGateTemplate,
  gateTemplates,
  planInstallation,
  recordStep,
  saveGateTemplate,
  siteLifecycle,
} from '@ocs/core/lifecycle';
import { clientList, setDeviceAlerts, siteList } from '@ocs/core/org';
import {
  addComment,
  commentToAction,
  openActions,
  projectFeed,
  recordVisit,
  staffList,
} from '@ocs/core/work';
import type { Runtime } from '@ocs/core/runtime';
import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { createMcpHttpHandler } from '@ocs/mcp';
import { errorResponse } from './errors.ts';

interface Env {
  Variables: { actor: Actor };
}

export function createApp(rt: Runtime): Hono {
  const app = new Hono();
  app.onError((err, c) => errorResponse(err, c));

  // better-auth: sign-in, sign-out, session, TOTP, passkeys. Direct sign-up is refused (invitation only).
  app.on(['GET', 'POST'], '/api/auth/*', (c) => rt.auth.handler(c.req.raw));

  // D-33: MCP for AI clients, OAuth as the person. Discovery first (RFC 9728 / RFC 8414), then the endpoint.
  const origin = new URL(rt.baseURL).origin;
  const resourceMetadataUrl = `${origin}/.well-known/oauth-protected-resource`;
  app.get('/.well-known/oauth-protected-resource', (c) =>
    c.json({
      resource: `${origin}/mcp`,
      authorization_servers: [`${origin}/api/auth`],
      bearer_methods_supported: ['header'],
      resource_name: 'OCS',
    }),
  );
  const authServerMetadata = oauthProviderAuthServerMetadata(rt.auth);
  app.get('/.well-known/oauth-authorization-server', (c) => authServerMetadata(c.req.raw));
  app.get('/.well-known/oauth-authorization-server/api/auth', (c) => authServerMetadata(c.req.raw));
  const mcp = createMcpHttpHandler({
    kernel: rt.kernel,
    // The person behind an active access token (not expired, not revoked); the OAuth provider decides.
    personOf: async (token) => {
      try {
        const info = (await rt.auth.api.oauth2UserInfo({
          headers: new Headers({ authorization: `Bearer ${token}` }),
        })) as { sub?: string } | null;
        return info?.sub ?? null;
      } catch {
        return null;
      }
    },
    loadActor: (userId) => rt.identity.loadActor(userId),
    resourceMetadataUrl,
  });
  app.on(['GET', 'POST', 'DELETE'], '/mcp', (c) => mcp(c.req.raw));

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

  // E4: the project's devices, platform status and the gate each channel counts (site page, Devices).
  api.get('/sites/:siteId/devices', async (c) =>
    c.json(await rt.kernel.read(siteDevices, c.get('actor'), { siteId: c.req.param('siteId') })),
  );

  // E4 AC1 / D-29 fallback: register a device by SN when it is not (yet) on the device platform.
  api.post('/sites/:siteId/devices', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const input = { ...body, siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(registerDevice, c.get('actor'), input, 'web'), 201);
  });

  // D-31: firmware and algorithm version of devices; known firmware problems (R&D reference).
  api.post('/sites/:siteId/devices/versions', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const input = { ...body, siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(setVersions, c.get('actor'), input, 'web'));
  });
  api.post('/firmware-issues', async (c) =>
    c.json(await rt.kernel.execute(recordFirmwareIssue, c.get('actor'), await c.req.json(), 'web'), 201),
  );

  // E3 (SOP-DEL-04): life cycle — steps, gates, planned installation, R9 readiness.
  api.get('/sites/:siteId/lifecycle', async (c) =>
    c.json(await rt.kernel.read(siteLifecycle, c.get('actor'), { siteId: c.req.param('siteId') })),
  );
  api.post('/sites/:siteId/steps', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(
      await rt.kernel.execute(recordStep, c.get('actor'), { ...body, siteId: c.req.param('siteId') }, 'web'),
      201,
    );
  });
  api.put('/sites/:siteId/installation', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(
      await rt.kernel.execute(
        planInstallation,
        c.get('actor'),
        { ...body, siteId: c.req.param('siteId') },
        'web',
      ),
    );
  });

  // E2 (SOP-DEL-01): Handover Card, intake review, Conditional Start, Intake Register.
  api.get('/sites/:siteId/handover-card', async (c) =>
    c.json(await rt.kernel.read(handoverCardView, c.get('actor'), { siteId: c.req.param('siteId') })),
  );
  api.post('/sites/:siteId/handover-card', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(saveHandoverCard, c.get('actor'), input, 'web'), 201);
  });
  api.post('/sites/:siteId/handover-card/submit', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(submitHandoverCard, c.get('actor'), input, 'web'), 201);
  });
  api.post('/sites/:siteId/intake-decision', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(decideIntake, c.get('actor'), input, 'web'), 201);
  });
  api.post('/sites/:siteId/conditional-start', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(authoriseConditionalStart, c.get('actor'), input, 'web'), 201);
  });
  api.get('/intake-register', async (c) => {
    const month = c.req.query('month');
    return c.json(await rt.kernel.read(intakeRegister, c.get('actor'), month ? { month } : {}));
  });

  // D-32: gate templates by scope (base, client, client + country); a director or above changes them.
  api.get('/gate-templates', async (c) => c.json(await rt.kernel.read(gateTemplates, c.get('actor'), {})));
  api.post('/gate-templates', async (c) =>
    c.json(await rt.kernel.execute(saveGateTemplate, c.get('actor'), await c.req.json(), 'web'), 201),
  );
  api.post('/gate-templates/:id/archive', async (c) =>
    c.json(await rt.kernel.execute(archiveGateTemplate, c.get('actor'), { id: c.req.param('id') }, 'web')),
  );

  // E4: link the project to its mall on the device platform; the offline alerts checkbox (Vlad, 3 Nov).
  api.put('/sites/:siteId/device-alerts', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const input = { ...body, siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(setDeviceAlerts, c.get('actor'), input, 'web'));
  });

  app.route('/api', api);
  return app;
}
