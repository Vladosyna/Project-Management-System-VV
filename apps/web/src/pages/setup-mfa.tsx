import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import QRCode from 'qrcode';
import { AuthLayout, Button, Form, FormMessage, TextField, useI18n } from '@ocs/ui';
import { authClient } from '../auth-client.ts';

/** Mandatory TOTP set-up (ADR-002): confirm password → scan → confirm with the first code. */
export function SetupMfaPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState<{ image: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    const { data, error: failed } = await authClient.twoFactor.enable({ password });
    if (failed || !('totpURI' in data)) {
      setError(t('auth.signIn.failed'));
      return;
    }
    const secret = new URL(data.totpURI).searchParams.get('secret') ?? '';
    setQr({ image: await QRCode.toDataURL(data.totpURI), secret });
  }

  async function verify() {
    setError(null);
    const { error: failed } = await authClient.twoFactor.verifyTotp({ code });
    if (failed) setError(t('auth.totp.failed'));
    else await navigate({ to: '/' });
  }

  return (
    <AuthLayout title={t('auth.mfa.title')}>
      {qr ? (
        <Form onSubmit={verify}>
          <p>{t('auth.mfa.scan')}</p>
          <img className="ocs-qr" src={qr.image} alt={t('auth.mfa.qrAlt')} />
          <div>
            <div className="ocs-field__label">{t('auth.mfa.secret')}</div>
            <div className="ocs-secret" data-testid="totp-secret">
              {qr.secret}
            </div>
          </div>
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
          <Button type="submit">{t('auth.mfa.verify')}</Button>
        </Form>
      ) : (
        <Form onSubmit={start}>
          <p>{t('auth.mfa.intro')}</p>
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
          <Button type="submit">{t('auth.mfa.start')}</Button>
        </Form>
      )}
    </AuthLayout>
  );
}
