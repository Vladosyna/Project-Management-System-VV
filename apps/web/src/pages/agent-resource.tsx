// Admin → AI connections (D-33): create, once, the MCP resource client OCS uses to check AI agent tokens by
// introspection. Its secret is shown once here and goes into the secret store as OCS_MCP_INTROSPECTION_CLIENT_ID /
// _SECRET; OCS never keeps it in clear. The API refuses everyone but admins.
import { useState } from 'react';
import { Button, Card, FormMessage, useI18n } from '@ocs/ui';

/** Environment variable names (identifiers, not UI text): the API reads them at start. */
const ENV_PREFIX = 'OCS_MCP_INTROSPECTION_CLIENT_';
const ENV_NAMES = [`${ENV_PREFIX}ID`, `${ENV_PREFIX}SECRET`] as const;

interface Created {
  readonly clientId: string;
  readonly clientSecret: string | null;
}

export function AgentResourceSetup() {
  const { t } = useI18n();
  const [created, setCreated] = useState<Created | 'forbidden' | 'failed' | null>(null);
  const create = async () => {
    const res = await fetch('/api/admin/agent-resource-client', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (res.status === 403) setCreated('forbidden');
    else if (res.ok) setCreated((await res.json()) as Created);
    else setCreated('failed');
  };
  return (
    <Card>
      <h2>{t('admin.agents.title')}</h2>
      <p>{t('admin.agents.intro')}</p>
      {created === 'forbidden' ? <FormMessage tone="error">{t('admin.agents.forbidden')}</FormMessage> : null}
      {created === 'failed' ? <FormMessage tone="error">{t('admin.agents.failed')}</FormMessage> : null}
      {created && typeof created === 'object' ? (
        <div className="ocs-stack">
          <FormMessage tone="ok">{t('admin.agents.once')}</FormMessage>
          <p>
            {`${ENV_NAMES[0]} = `}
            <code data-testid="agent-client-id">{created.clientId}</code>
          </p>
          <p>
            {`${ENV_NAMES[1]} = `}
            <code>{created.clientSecret ?? '—'}</code>
          </p>
        </div>
      ) : (
        <Button type="button" onClick={() => void create()}>
          {t('admin.agents.create')}
        </Button>
      )}
    </Card>
  );
}
