import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AuthLayout, Button, Form, FormMessage, TextField, useI18n } from '@ocs/ui';
import { acceptInvitation } from '../api.ts';

/** The invitation link carries its token in the URL fragment, which never reaches a server log. */
export function AcceptInvitationPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const token = window.location.hash.slice(1);
    if (await acceptInvitation({ token, name, password })) await navigate({ to: '/setup-mfa' });
    else setError(t('auth.accept.invalid'));
  }

  return (
    <AuthLayout title={t('auth.accept.title')}>
      <Form onSubmit={submit}>
        <TextField
          id="name"
          label={t('auth.accept.name')}
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <TextField
          id="password"
          label={t('auth.password')}
          hint={t('auth.accept.passwordHint')}
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit">{t('auth.accept.submit')}</Button>
      </Form>
    </AuthLayout>
  );
}
