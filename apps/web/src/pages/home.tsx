import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, FormMessage, PageHeader, useI18n } from '@ocs/ui';
import { authClient } from '../auth-client.ts';
import type { Me } from '../api.ts';

function greetingKey(hour: number) {
  if (hour < 12) return 'home.greeting.morning' as const;
  if (hour < 18) return 'home.greeting.afternoon' as const;
  return 'home.greeting.evening' as const;
}

/** "My desk" — the cards fill with actions, alerts and cases as the V1 modules land (E5, E6, E8). */
export function HomePage(props: { me: Me }) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [passkeyAdded, setPasskeyAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-GB', { dateStyle: 'full' }).format(
    new Date(),
  );

  async function addPasskey() {
    setError(null);
    const result = await authClient.passkey.addPasskey();
    if (result.error) setError(t('auth.error.generic'));
    else setPasskeyAdded(true);
  }

  async function signOut() {
    await authClient.signOut();
    await navigate({ to: '/login' });
  }

  return (
    <>
      <PageHeader
        eyebrow={`${t('home.eyebrow')} · ${today}`}
        title={t(greetingKey(new Date().getHours()), { name: props.me.name })}
      />
      <Card>
        <p>{t('home.empty')}</p>
      </Card>
      <Card title={t('home.security.title')} titleId="security-title">
        <div className="ocs-page-header__actions">
          <Button variant="secondary" onClick={() => void addPasskey()}>
            {t('home.security.addPasskey')}
          </Button>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t('home.security.signOut')}
          </Button>
        </div>
        {passkeyAdded ? <FormMessage tone="ok">{t('home.security.passkeyAdded')}</FormMessage> : null}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      </Card>
    </>
  );
}

export function NotYetPage() {
  const { t } = useI18n();
  return (
    <Card>
      <p>{t('page.notYet')}</p>
    </Card>
  );
}
