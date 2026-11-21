// better-auth browser client: same origin (/api/auth via the dev proxy or the reverse proxy in production).
import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { oauthProviderClient } from '@better-auth/oauth-provider/client';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  // oauthProviderClient: carries the signed OAuth query through sign-in and consent when an AI client sent the
  // person here (D-33).
  plugins: [twoFactorClient(), passkeyClient(), oauthProviderClient()],
});
