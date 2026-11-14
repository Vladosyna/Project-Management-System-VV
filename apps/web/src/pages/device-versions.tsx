// D-31 forms on the Devices tab: firmware and algorithm version for chosen devices (PM, R&D), and a known
// problem of a firmware (R&D). The API refuses roles that may not; the forms say so.
import { useState } from 'react';
import { Button, CheckboxGroup, Form, FormMessage, SelectField, TextField, useI18n } from '@ocs/ui';
import { registerSiteDevice, saveFirmwareIssue, saveVersions, type SiteDevice } from '../api.ts';

type Outcome = 'ok' | 'forbidden' | 'invalid' | 'duplicate' | 'failed';

function Message(props: { outcome: Outcome | null }) {
  const { t } = useI18n();
  if (props.outcome === null) return null;
  return (
    <FormMessage tone={props.outcome === 'ok' ? 'ok' : 'error'}>{t(`versions.${props.outcome}`)}</FormMessage>
  );
}

export function VersionsForm(props: { siteId: string; devices: readonly SiteDevice[]; onDone: () => void }) {
  const { t } = useI18n();
  const [chosen, setChosen] = useState<string[]>([]);
  const [firmware, setFirmware] = useState('');
  const [algorithm, setAlgorithm] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const submit = async () => {
    setOutcome(null);
    try {
      const result = await saveVersions(props.siteId, {
        deviceIds: chosen,
        ...(firmware.trim() ? { firmware: firmware.trim() } : {}),
        ...(algorithm.trim() ? { algorithmVersion: algorithm.trim() } : {}),
      });
      setOutcome(result);
      if (result === 'ok') {
        setChosen([]);
        props.onDone();
      }
    } catch {
      setOutcome('failed');
    }
  };
  return (
    <Form onSubmit={submit}>
      <h3>{t('versions.title')}</h3>
      <CheckboxGroup
        legend={t('versions.devices')}
        options={props.devices.map((d) => ({ id: d.id, label: d.sn }))}
        value={chosen}
        onChange={setChosen}
      />
      <TextField
        id="versions-firmware"
        label={t('versions.firmware')}
        value={firmware}
        onChange={(e) => {
          setFirmware(e.currentTarget.value);
        }}
      />
      <TextField
        id="versions-algorithm"
        label={t('versions.algorithm')}
        value={algorithm}
        onChange={(e) => {
          setAlgorithm(e.currentTarget.value);
        }}
      />
      <Message outcome={outcome} />
      <div>
        <Button
          type="submit"
          disabled={chosen.length === 0 || (firmware.trim() === '' && algorithm.trim() === '')}
        >
          {t('versions.save')}
        </Button>
      </div>
    </Form>
  );
}

export function FirmwareIssueForm() {
  const { t } = useI18n();
  const [model, setModel] = useState('');
  const [firmware, setFirmware] = useState('');
  const [summary, setSummary] = useState('');
  const [severity, setSeverity] = useState<'info' | 'degraded' | 'critical'>('degraded');
  const [source, setSource] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const submit = async () => {
    setOutcome(null);
    try {
      const result = await saveFirmwareIssue({
        model: model.trim(),
        firmware: firmware.trim(),
        summary: summary.trim(),
        severity,
        ...(source.trim() ? { source: source.trim() } : {}),
      });
      setOutcome(result);
      if (result === 'ok') {
        setSummary('');
        setSource('');
      }
    } catch {
      setOutcome('failed');
    }
  };
  return (
    <Form onSubmit={submit}>
      <h3>{t('issue.title')}</h3>
      <TextField
        id="issue-model"
        label={t('issue.model')}
        value={model}
        required
        onChange={(e) => {
          setModel(e.currentTarget.value);
        }}
      />
      <TextField
        id="issue-firmware"
        label={t('versions.firmware')}
        value={firmware}
        required
        onChange={(e) => {
          setFirmware(e.currentTarget.value);
        }}
      />
      <TextField
        id="issue-summary"
        label={t('issue.summary')}
        value={summary}
        required
        onChange={(e) => {
          setSummary(e.currentTarget.value);
        }}
      />
      <SelectField
        id="issue-severity"
        label={t('issue.severity')}
        value={severity}
        options={(['info', 'degraded', 'critical'] as const).map((v) => ({
          value: v,
          label: t(`issue.severity.${v}`),
        }))}
        onChange={(e) => {
          setSeverity(e.currentTarget.value as 'info' | 'degraded' | 'critical');
        }}
      />
      <TextField
        id="issue-source"
        label={t('issue.source')}
        hint={t('issue.sourceHint')}
        value={source}
        onChange={(e) => {
          setSource(e.currentTarget.value);
        }}
      />
      <Message outcome={outcome} />
      <div>
        <Button type="submit">{t('issue.save')}</Button>
      </div>
    </Form>
  );
}

/** E4 AC1 / D-29: register a device by SN by hand, when the platform does not list it. */
export function RegisterDeviceForm(props: { siteId: string; onDone: () => void }) {
  const { t } = useI18n();
  const [sn, setSn] = useState('');
  const [model, setModel] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const submit = async () => {
    setOutcome(null);
    try {
      const result = await registerSiteDevice(props.siteId, { sn: sn.trim(), model: model.trim() });
      setOutcome(result);
      if (result === 'ok') {
        setSn('');
        props.onDone();
      }
    } catch {
      setOutcome('failed');
    }
  };
  return (
    <Form onSubmit={submit}>
      <h3>{t('register.title')}</h3>
      <TextField
        id="register-sn"
        label={t('devices.col.sn')}
        value={sn}
        required
        onChange={(e) => {
          setSn(e.currentTarget.value);
        }}
      />
      <TextField
        id="register-model"
        label={t('devices.col.model')}
        value={model}
        required
        onChange={(e) => {
          setModel(e.currentTarget.value);
        }}
      />
      <Message outcome={outcome} />
      <div>
        <Button type="submit">{t('register.save')}</Button>
      </div>
    </Form>
  );
}
