// Lifecycle tab (E3, SOP-DEL-04): the base steps with their dates and evidence, the client's gates, the planned
// installation date with R9 readiness, and forms to record the next step or set the date.
import { useEffect, useState } from 'react';
import { Button, Form, FormMessage, SelectField, StatusChip, TextField, useI18n } from '@ocs/ui';
import { loadLifecycle, writeLifecycle, type SiteLifecycle as Lifecycle } from '../api.ts';

const STEP_LABELS: Record<
  string,
  `lifecycle.step.${'card_received' | 'card_complete' | 'readiness_confirmed' | 'go_no_go' | 'installed' | 'accepted'}`
> = {
  card_received: 'lifecycle.step.card_received',
  card_complete: 'lifecycle.step.card_complete',
  readiness_confirmed: 'lifecycle.step.readiness_confirmed',
  go_no_go: 'lifecycle.step.go_no_go',
  installed: 'lifecycle.step.installed',
  accepted: 'lifecycle.step.accepted',
};

type Outcome = 'ok' | 'forbidden' | 'rule' | 'conflict' | 'invalid' | 'failed';

export function SiteLifecycle(props: { siteId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<Lifecycle | 'forbidden' | 'failed' | null>(null);
  const [version, setVersion] = useState(0);
  const [step, setStep] = useState('');
  const [doneOn, setDoneOn] = useState('');
  const [evidence, setEvidence] = useState('');
  const [date, setDate] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  useEffect(() => {
    loadLifecycle(props.siteId).then(
      (d) => {
        setData(d ?? 'forbidden');
      },
      () => {
        setData('failed');
      },
    );
  }, [props.siteId, version]);

  if (data === null) return <p>{t('common.loading')}</p>;
  if (data === 'forbidden') return <p>{t('site.tile.noAccess')}</p>;
  if (data === 'failed') return <FormMessage tone="error">{t('lifecycle.failed')}</FormMessage>;
  const done = new Map(data.steps.map((s) => [s.step, s]));
  const options = [...data.baseSteps, ...data.gates.map((g) => g.key)].filter((k) => !done.has(k));
  const label = (key: string) => {
    const gate = data.gates.find((g) => g.key === key)?.name;
    const base = STEP_LABELS[key];
    return gate ?? (base ? t(base) : key);
  };
  const send = async (run: () => ReturnType<typeof writeLifecycle>) => {
    setOutcome(null);
    try {
      const result = await run();
      setOutcome(result);
      if (result === 'ok') setVersion((v) => v + 1);
    } catch {
      setOutcome('failed');
    }
  };

  return (
    <div className="ocs-stack">
      <p>
        {t('lifecycle.planned')}: {data.plannedInstallationDate ?? '—'}
        {data.workingDaysToInstallation !== null
          ? ` · ${t('lifecycle.daysTo', { days: String(data.workingDaysToInstallation) })}`
          : ''}
        {data.readinessAtRisk ? (
          <>
            {' '}
            <StatusChip tone="escalated" /> {t('lifecycle.readinessAtRisk')}
          </>
        ) : null}
      </p>
      <table className="ocs-table">
        <thead>
          <tr>
            <th scope="col">{t('lifecycle.col.step')}</th>
            <th scope="col">{t('lifecycle.col.date')}</th>
            <th scope="col">{t('lifecycle.col.evidence')}</th>
          </tr>
        </thead>
        <tbody>
          {data.baseSteps.map((key) => (
            <tr key={key}>
              <td>{label(key)}</td>
              <td>{done.get(key)?.doneOn ?? '—'}</td>
              <td>{done.get(key)?.evidence ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.template ? (
        <>
          <h3>{data.template.name}</h3>
          <ul className="ocs-board__list">
            {data.gates.map((g) => (
              <li key={g.key} className="ocs-board__card">
                <div className="ocs-board__title">{g.name}</div>
                <div className="ocs-board__meta">
                  {t(`lifecycle.gate.${g.status}`)}
                  {g.doneOn ? ` · ${g.doneOn}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Form
        onSubmit={() =>
          send(() =>
            writeLifecycle('POST', props.siteId, 'steps', {
              step,
              doneOn,
              ...(evidence.trim() ? { evidence: evidence.trim() } : {}),
            }),
          )
        }
      >
        <h3>{t('lifecycle.record')}</h3>
        <SelectField
          id="lifecycle-step"
          label={t('lifecycle.col.step')}
          value={step}
          options={[{ value: '', label: '—' }, ...options.map((k) => ({ value: k, label: label(k) }))]}
          onChange={(e) => {
            setStep(e.currentTarget.value);
          }}
        />
        <TextField
          id="lifecycle-date"
          type="date"
          label={t('lifecycle.col.date')}
          value={doneOn}
          onChange={(e) => {
            setDoneOn(e.currentTarget.value);
          }}
        />
        <TextField
          id="lifecycle-evidence"
          label={t('lifecycle.col.evidence')}
          hint={t('lifecycle.evidenceHint')}
          value={evidence}
          onChange={(e) => {
            setEvidence(e.currentTarget.value);
          }}
        />
        <div>
          <Button type="submit" disabled={step === '' || doneOn === ''}>
            {t('lifecycle.recordSave')}
          </Button>
        </div>
      </Form>
      <Form onSubmit={() => send(() => writeLifecycle('PUT', props.siteId, 'installation', { date }))}>
        <TextField
          id="lifecycle-install"
          type="date"
          label={t('lifecycle.planned')}
          value={date}
          onChange={(e) => {
            setDate(e.currentTarget.value);
          }}
        />
        <div>
          <Button type="submit" disabled={date === ''}>
            {t('lifecycle.planSave')}
          </Button>
        </div>
      </Form>
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
          {t(`lifecycle.outcome.${outcome}`)}
        </FormMessage>
      ) : null}
    </div>
  );
}
