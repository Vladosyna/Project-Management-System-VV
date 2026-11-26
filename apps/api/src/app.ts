// HTTP API (ADR-001 P-03). Thin: session → actor → core command/query → JSON. No business logic here.
import { Hono } from 'hono';
import type { Actor } from '@ocs/contracts';
import { inviteUser, me, setupAgentResource } from '@ocs/core/identity';
import {
  authoriseConditionalStart,
  decideDispute,
  decideIntake,
  raiseDispute,
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
import { archiveRecord, confirmRecord, proposeRecord, siteCommercial } from '@ocs/core/commercial';
import { clientList, setDeviceAlerts, siteList } from '@ocs/core/org';
import {
  addComment,
  commentToAction,
  completeAction,
  createAction,
  openActions,
  projectFeed,
  recordVisit,
  staffList,
} from '@ocs/core/work';
import { offeredOperations, operationsFor, type Runtime } from '@ocs/core/runtime';
import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { createMcpHttpHandler } from '@ocs/mcp';
import { errorResponse } from './errors.ts';
import { openApiDocument } from './openapi.ts';
import { createAgentTokenCheck, type IntrospectionClient } from './agent-tokens.ts';

interface Env {
  Variables: { actor: Actor };
}

export interface AppOptions {
  /** D-33: the MCP resource client for token introspection (secret store); without it, userinfo is used. */
  readonly introspection?: IntrospectionClient;
}

export function createApp(rt: Runtime, options: AppOptions = {}): Hono {
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
  const agentToken = createAgentTokenCheck(rt, options.introspection);
  const mcp = createMcpHttpHandler({
    kernel: rt.kernel,
    // Active, not revoked, and (with introspection) issued for /mcp; the OAuth provider decides.
    personOf: (token) => agentToken(token, 'mcp', `${origin}/mcp`),
    loadActor: (userId) => rt.identity.loadActor(userId),
    resourceMetadataUrl,
  });
  app.on(['GET', 'POST', 'DELETE'], '/mcp', (c) => mcp(c.req.raw));

  // D-33: REST + OpenAPI from the same registry, for AI platforms without MCP. The catalogue is public; every
  // call needs the person's OAuth token and runs through the kernel as them (source 'api', via 'api').
  app.get('/api/v1/openapi.json', (c) => c.json(openApiDocument(origin, offeredOperations())));
  app.post('/api/v1/:operation', async (c) => {
    const token = /^Bearer\s+(.+)$/i.exec(c.req.header('authorization') ?? '')?.[1]?.trim();
    const agent = token ? await agentToken(token, 'api') : null;
    const person = agent ? await rt.identity.loadActor(agent.userId) : undefined;
    if (!agent || !person) {
      c.header('www-authenticate', `Bearer resource_metadata="${resourceMetadataUrl}"`);
      return c.json({ error: 'unauthorized' }, 401);
    }
    const actor = { ...person, via: agent.via };
    const op = operationsFor(actor).find((o) => o.name === c.req.param('operation'));
    if (!op) return c.json({ error: 'not_found', message: 'No such operation for this person' }, 404);
    const input = await c.req.json<unknown>().catch(() => ({}));
    const result =
      op.operation.kind === 'query'
        ? await rt.kernel.read(op.operation, actor, input)
        : await rt.kernel.execute(op.operation, actor, input, 'api');
    return c.json(result ?? null);
  });

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

  // E13 (D-34 N2): commercial records of a site — PO, DPIA, invoice, price list; original currency + EUR.
  api.get('/sites/:siteId/commercial', async (c) =>
    c.json(await rt.kernel.read(siteCommercial, c.get('actor'), { siteId: c.req.param('siteId') })),
  );
  api.post('/sites/:siteId/commercial', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(proposeRecord, c.get('actor'), input, 'web'), 201);
  });
  api.post('/commercial/:recordId/confirm', async (c) =>
    c.json(
      await rt.kernel.execute(confirmRecord, c.get('actor'), { recordId: c.req.param('recordId') }, 'web'),
    ),
  );
  api.post('/commercial/:recordId/archive', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), recordId: c.req.param('recordId') };
    return c.json(await rt.kernel.execute(archiveRecord, c.get('actor'), input, 'web'));
  });

  // D-36: a task in a project for a specific person (owner, due); the owner or a director/PM marks it done.
  api.post('/sites/:siteId/actions', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const input = { ...body, siteId: c.req.param('siteId'), source: { kind: 'manual' } };
    return c.json(await rt.kernel.execute(createAction, c.get('actor'), input, 'web'), 201);
  });
  api.post('/actions/:actionId/complete', async (c) =>
    c.json(
      await rt.kernel.execute(completeAction, c.get('actor'), { actionId: c.req.param('actionId') }, 'web'),
    ),
  );

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
  // SOP-DEL-01 §9: disputes of a Returned decision (Sales raises, the sponsor decides).
  api.post('/sites/:siteId/intake-dispute', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(raiseDispute, c.get('actor'), input, 'web'), 201);
  });
  api.post('/sites/:siteId/intake-dispute/decide', async (c) => {
    const input = { ...(await c.req.json<Record<string, unknown>>()), siteId: c.req.param('siteId') };
    return c.json(await rt.kernel.execute(decideDispute, c.get('actor'), input, 'web'));
  });
  api.get('/intake-register', async (c) => {
    const month = c.req.query('month');
    return c.json(await rt.kernel.read(intakeRegister, c.get('actor'), month ? { month } : {}));
  });

  // D-33: the AI agents the person connected (OAuth consents), and disconnecting one (tokens revoked at once).
  api.get('/agents', async (c) => {
    const headers = c.req.raw.headers;
    const consents = (await rt.auth.api.getOAuthConsents({ headers })) as {
      clientId: string;
      scopes: string[] | string;
      createdAt?: string | Date;
    }[];
    const agents = await Promise.all(
      consents.map(async (consent) => {
        const client = (await rt.auth.api
          .getOAuthClientPublic({ query: { client_id: consent.clientId }, headers })
          .catch(() => null)) as { client_name?: string } | null;
        return {
          clientId: consent.clientId,
          name: client?.client_name ?? null,
          since: consent.createdAt ? new Date(consent.createdAt).toISOString() : null,
        };
      }),
    );
    return c.json(agents);
  });
  api.post('/agents/:clientId/revoke', async (c) =>
    c.json(await rt.identity.revokeAgent(c.get('actor'), c.req.param('clientId'))),
  );

  // D-33: an admin creates the MCP resource client once; the secret is shown once, for the secret store
  // (OCS_MCP_INTROSPECTION_CLIENT_ID / _SECRET), then agent tokens are checked by introspection.
  api.post('/admin/agent-resource-client', async (c) => {
    await rt.kernel.execute(setupAgentResource, c.get('actor'), {}, 'web');
    const created = (await rt.auth.api.adminCreateOAuthClient({
      headers: c.req.raw.headers,
      body: {
        client_name: 'OCS MCP resource (token introspection)',
        // Never used for sign-in: this client only introspects tokens.
        redirect_uris: ['https://ocs.example.invalid/unused'],
        token_endpoint_auth_method: 'client_secret_post',
        grant_types: ['authorization_code'],
      },
    })) as { client_id: string; client_secret?: string };
    return c.json({ clientId: created.client_id, clientSecret: created.client_secret ?? null }, 201);
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
