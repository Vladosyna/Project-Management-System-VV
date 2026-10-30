import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AuthLayout, Button, Form, FormMessage, TextField, useI18n } from '@ocs/ui';
import { authClient } from '../auth-client.ts';

/** Password, then the TOTP code; or a passkey alone. */
export function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const home = () => navigate({ to: '/' });

  async function signIn() {
    setError(null);
    const { data, error: failed } = await authClient.signIn.email({ email, password });
    if (failed) {
      setError(t('auth.signIn.failed'));
      return;
    }
    if ('twoFactorRedirect' in data && data.twoFactorRedirect) setStep('totp');
    else await home();
  }

  async function verify() {
    setError(null);
    const { error: failed } = await authClient.twoFactor.verifyTotp({ code });
    if (failed) setError(t('auth.totp.failed'));
    else await home();
  }

  async function passkey() {
    setError(null);
    const result = await authClient.signIn.passkey();
    if (result.error) setError(t('auth.error.generic'));
    else await home();
  }

  if (step === 'totp') {
    return (
      <AuthLayout title={t('auth.totp.title')}>
        <Form onSubmit={verify}>
          <TextField
            id="code"
            label={t('auth.totp.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
            }}
          />
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
          <Button type="submit">{t('auth.totp.submit')}</Button>
        </Form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.signIn.title')}>
      <Form onSubmit={signIn}>
        <TextField
          id="email"
          label={t('auth.email')}
          type="email"
          autoComplete="username webauthn"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <TextField
          id="password"
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit">{t('auth.signIn.submit')}</Button>
        <Button variant="secondary" onClick={() => void passkey()}>
          {t('auth.signIn.passkey')}
        </Button>
      </Form>
    </AuthLayout>
  );
}
