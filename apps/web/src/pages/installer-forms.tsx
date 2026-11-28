// Installers tab forms (E12 AC1, AC3): a new job on the project, and an installer's quote line by line in its
// currency (rate to EUR unless EUR). The API computes the exact total and EUR; a person's entry is confirmed at once.
import { useState } from 'react';
import { Button, Form, FormMessage, SelectField, TextField, useI18n } from '@ocs/ui';
import { installerWrite } from '../api.ts';

type Outcome = 'ok' | 'forbidden' | 'invalid' | 'rule' | 'readiness' | 'conflict' | 'failed';
interface Partner {
  id: string;
  name: string;
}
const KINDS = ['unit', 'hour', 'travel', 'extra'] as const;
type Kind = (typeof KINDS)[number];
interface Line {
  kind: Kind;
  description: string;
  quantity: string;
  unitPrice: string;
}

function useWrite(onDone: () => void) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const run = async (path: string, body: Record<string, unknown>) => {
    setOutcome(null);
    try {
      const r = await installerWrite(path, body);
      setOutcome(r);
      if (r === 'ok') onDone();
    } catch {
      setOutcome('failed');
    }
  };
  return { outcome, run };
}

export function NewJob(props: { siteId: string; onDone: () => void }) {
  const { t } = useI18n();
  const [scope, setScope] = useState<'partial' | 'full'>('partial');
  const [sensors, setSensors] = useState('');
  const [sow, setSow] = useState('');
  const { outcome, run } = useWrite(props.onDone);
  return (
    <Form
      onSubmit={() =>
        run(`sites/${encodeURIComponent(props.siteId)}/installer-jobs`, {
          scope,
          sensorCount: Number(sensors),
          ...(sow.trim() ? { sowVersion: sow.trim() } : {}),
        })
      }
    >
      <h3>{t('installers.newJob')}</h3>
      <SelectField
        id="job-scope"
        label={t('installers.scope')}
        value={scope}
        options={(['partial', 'full'] as const).map((s) => ({ value: s, label: t(`installers.scope.${s}`) }))}
        onChange={(e) => {
          setScope(e.currentTarget.value as 'partial' | 'full');
        }}
      />
      <TextField
        id="job-sensors"
        type="number"
        min={1}
        label={t('installers.sensors')}
        value={sensors}
        onChange={(e) => {
          setSensors(e.currentTarget.value);
        }}
      />
      <TextField
        id="job-sow"
        label={t('installers.sow')}
        value={sow}
        onChange={(e) => {
          setSow(e.currentTarget.value);
        }}
      />
      <div>
        <Button type="submit">{t('installers.createJob')}</Button>
      </div>
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
          {t(`installers.outcome.${outcome}`)}
        </FormMessage>
      ) : null}
    </Form>
  );
}

export function NewQuote(props: { jobId: string; partners: readonly Partner[]; onDone: () => void }) {
  const { t } = useI18n();
  const empty = (): Line => ({ kind: 'unit', description: '', quantity: '', unitPrice: '' });
  const [partnerId, setPartnerId] = useState(props.partners[0]?.id ?? '');
  const [lines, setLines] = useState<Line[]>([empty()]);
  const [currency, setCurrency] = useState('EUR');
  const [rate, setRate] = useState('');
  const [fxDate, setFxDate] = useState('');
  const { outcome, run } = useWrite(props.onDone);
  const key = props.jobId.slice(0, 8);
  const setLine = (n: number, patch: Partial<Line>) => {
    setLines((ls) => ls.map((l, i) => (i === n ? { ...l, ...patch } : l)));
  };
  const cur = currency.trim().toUpperCase();
  return (
    <Form
      onSubmit={() =>
        run(`installer-jobs/${encodeURIComponent(props.jobId)}/quotes`, {
          partnerId,
          lines: lines.map((l) => ({ ...l, quantity: Number(l.quantity) })),
          currency: cur,
          fxDate,
          ...(cur === 'EUR' ? {} : { fxRate: rate.trim() }),
          source: { kind: 'manual' },
        })
      }
    >
      <h4>{t('installers.newQuote')}</h4>
      <SelectField
        id={`quote-partner-${key}`}
        label={t('installers.col.installer')}
        value={partnerId}
        options={props.partners.map((p) => ({ value: p.id, label: p.name }))}
        onChange={(e) => {
          setPartnerId(e.currentTarget.value);
        }}
      />
      {lines.map((l, n) => (
        // Rows have no id while being typed; the index is the row's identity here.
        <div key={n} className="ocs-stack">
          <SelectField
            id={`quote-${key}-kind-${String(n)}`}
            label={`${t('installers.line.kind')} ${String(n + 1)}`}
            value={l.kind}
            options={KINDS.map((k) => ({ value: k, label: t(`installers.line.${k}`) }))}
            onChange={(e) => {
              setLine(n, { kind: e.currentTarget.value as Kind });
            }}
          />
          <TextField
            id={`quote-${key}-desc-${String(n)}`}
            label={`${t('installers.line.description')} ${String(n + 1)}`}
            value={l.description}
            onChange={(e) => {
              setLine(n, { description: e.currentTarget.value });
            }}
          />
          <TextField
            id={`quote-${key}-qty-${String(n)}`}
            label={`${t('installers.line.quantity')} ${String(n + 1)}`}
            value={l.quantity}
            onChange={(e) => {
              setLine(n, { quantity: e.currentTarget.value });
            }}
          />
          <TextField
            id={`quote-${key}-price-${String(n)}`}
            label={`${t('installers.line.unitPrice')} ${String(n + 1)}`}
            value={l.unitPrice}
            onChange={(e) => {
              setLine(n, { unitPrice: e.currentTarget.value });
            }}
          />
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setLines((ls) => [...ls, empty()]);
          }}
        >
          {t('installers.addLine')}
        </Button>
      </div>
      <TextField
        id={`quote-${key}-currency`}
        label={t('commercial.currency')}
        maxLength={3}
        value={currency}
        onChange={(e) => {
          setCurrency(e.currentTarget.value);
        }}
      />
      {cur === 'EUR' ? null : (
        <TextField
          id={`quote-${key}-rate`}
          label={t('commercial.rate')}
          value={rate}
          onChange={(e) => {
            setRate(e.currentTarget.value);
          }}
        />
      )}
      <TextField
        id={`quote-${key}-date`}
        type="date"
        label={t('installers.quoteDate')}
        value={fxDate}
        onChange={(e) => {
          setFxDate(e.currentTarget.value);
        }}
      />
      <div>
        <Button type="submit">{t('installers.saveQuote')}</Button>
      </div>
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
          {t(`installers.outcome.${outcome}`)}
        </FormMessage>
      ) : null}
    </Form>
  );
}
