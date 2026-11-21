// /oauth/consent — D-33 / D-07: an AI client (ChatGPT, Claude, any MCP client) asks to act for the signed-in person.
// The person sees which client, what it may do (exactly what they may do themselves, no more) and allows or denies.
// No token is issued without this. The signed OAuth query travels with the request (oauthProviderClient).
import { useEffect, useState } from 'react';
import { AuthLayout, Button, FormMessage, useI18n } from '@ocs/ui';
import { authClient } from '../auth-client.ts';

interface PublicClient {
  readonly client_name?: string;
  readonly client_uri?: string;
}

export function OAuthConsentPage() {
  const { t } = useI18n();
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client_id') ?? '';
  const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean);
  const [client, setClient] = useState<PublicClient | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void authClient
      .$fetch<PublicClient>('/oauth2/public-client', { method: 'GET', query: { client_id: clientId } })
      .then((r) => {
        setClient(r.data ?? {});
      });
  }, [clientId]);

  const answer = async (accept: boolean) => {
    setFailed(false);
    const r = await authClient.$fetch<{ redirect: boolean; url: string }>('/oauth2/consent', {
      method: 'POST',
      body: { accept },
    });
    if (r.data?.url) window.location.assign(r.data.url);
    else setFailed(true);
  };

  const name = client?.client_name ?? t('oauth.consent.unnamed');
  return (
    <AuthLayout title={t('oauth.consent.title', { client: name })}>
      <p>{t('oauth.consent.intro', { client: name })}</p>
      <ul>
        <li>{t('oauth.consent.asYou')}</li>
        <li>{t('oauth.consent.audited')}</li>
        <li>{t('oauth.consent.never')}</li>
        {scopes.includes('offline_access') ? <li>{t('oauth.consent.offline')}</li> : null}
      </ul>
      {client?.client_uri ? <p>{client.client_uri}</p> : null}
      {failed ? <FormMessage tone="error">{t('oauth.consent.failed')}</FormMessage> : null}
      <div>
        <Button type="button" onClick={() => void answer(true)}>
          {t('oauth.consent.allow')}
        </Button>{' '}
        <Button type="button" onClick={() => void answer(false)}>
          {t('oauth.consent.deny')}
        </Button>
      </div>
    </AuthLayout>
  );
}
