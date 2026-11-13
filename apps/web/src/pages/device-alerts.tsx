// The Devices card's platform settings (E4, Vlad 3 Nov): which mall on the device platform this project is, and
// the offline alerts checkbox (off by default). Directors and PMs may change them; the API refuses others.
import { useState } from 'react';
import { Button, CheckboxGroup, Form, FormMessage, TextField, useI18n } from '@ocs/ui';
import { saveDeviceAlerts, type SiteSummary } from '../api.ts';

type Outcome = 'saved' | 'forbidden' | 'conflict' | 'needsMall' | 'failed';

export function DeviceAlerts(props: { site: SiteSummary; onDone: () => void }) {
  const { t } = useI18n();
  const [mall, setMall] = useState(props.site.platformRef ?? '');
  const [alerts, setAlerts] = useState(props.site.deviceAlertsEnabled ?? false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const submit = async () => {
    setOutcome(null);
    try {
      const ref = mall.trim() === '' ? null : mall.trim();
      const result = await saveDeviceAlerts(props.site.id, ref, alerts);
      setOutcome(result === 'ok' ? 'saved' : result);
      if (result === 'ok') props.onDone();
    } catch {
      setOutcome('failed');
    }
  };

  return (
    <Form onSubmit={submit}>
      <TextField
        id="platform-mall"
        label={t('devices.mall')}
        hint={t('devices.mallHint')}
        value={mall}
        onChange={(e) => {
          setMall(e.currentTarget.value);
        }}
      />
      <CheckboxGroup
        legend={t('devices.alerts')}
        options={[{ id: 'on', label: t('devices.alertsOn') }]}
        value={alerts ? ['on'] : []}
        onChange={(v) => {
          setAlerts(v.includes('on'));
        }}
      />
      {outcome ? (
        <FormMessage tone={outcome === 'saved' ? 'ok' : 'error'}>{t(`devices.${outcome}`)}</FormMessage>
      ) : null}
      <div>
        <Button type="submit">{t('devices.save')}</Button>
      </div>
    </Form>
  );
}
