// Intake review on the Intake tab (E2 AC2/AC3, SOP-DEL-01 §5 step 4, §8): the Delivery Director decides on a
// submitted card — accepted, accepted with conditions (non-blocking items, deadlines within 5 working days) or
// returned with every gap listed. Once decided, the decision and its conditions are shown. Which items may be
// conditions and the deadline limit are checked by core; the API refuses other roles.
import { useState } from 'react';
import { Button, Form, FormMessage, SelectField, TextArea, TextField, useI18n } from '@ocs/ui';
import { intakeWrite, type HandoverCardView } from '../api.ts';

interface Condition {
  itemCode: string;
  text: string;
  deadline: string;
}
type Outcome = 'ok' | 'forbidden' | 'invalid' | 'rule' | 'conflict' | 'failed';
const DECISIONS = ['accepted', 'accepted_with_conditions', 'returned'] as const;

export function IntakeDecision(props: {
  siteId: string;
  card: HandoverCardView;
  codes: readonly string[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [decision, setDecision] = useState<(typeof DECISIONS)[number]>('accepted');
  const [standard, setStandard] = useState('L');
  const [reasons, setReasons] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const done = props.card.decision;

  if (done) {
    return (
      <div className="ocs-stack">
        <h3>{t('intake.review.title')}</h3>
        <p>
          {t(`intake.status.${props.card.status}`)}
          {done.reasons ? ` — ${done.reasons}` : ''}
        </p>
        {done.conditions.length > 0 ? (
          <ul>
            {done.conditions.map((c) => (
              <li key={c.itemCode}>
                {t('intake.review.conditionLine', {
                  code: c.itemCode,
                  text: c.text,
                  deadline: c.deadline,
                  status: c.status,
                })}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  if (props.card.status !== 'submitted') return null;

  const setRow = (n: number, patch: Partial<Condition>) => {
    setConditions((cs) => cs.map((c, i) => (i === n ? { ...c, ...patch } : c)));
  };
  const submit = async () => {
    setOutcome(null);
    try {
      const r = await intakeWrite(props.siteId, 'intake-decision', {
        decision,
        folderStandard: standard,
        conditions: decision === 'accepted_with_conditions' ? conditions : [],
        ...(reasons.trim() ? { reasons: reasons.trim() } : {}),
      });
      setOutcome(r);
      if (r === 'ok') props.onDone();
    } catch {
      setOutcome('failed');
    }
  };

  return (
    <Form onSubmit={submit}>
      <h3>{t('intake.review.title')}</h3>
      <SelectField
        id="intake-decision"
        label={t('intake.review.decision')}
        value={decision}
        options={DECISIONS.map((d) => ({ value: d, label: t(`intake.status.${d}`) }))}
        onChange={(e) => {
          setDecision(e.currentTarget.value as (typeof DECISIONS)[number]);
        }}
      />
      <SelectField
        id="intake-standard"
        label={t('intake.review.standard')}
        value={standard}
        options={['L', 'S', 'mixed'].map((s) => ({ value: s, label: s }))}
        onChange={(e) => {
          setStandard(e.currentTarget.value);
        }}
      />
      <TextArea
        id="intake-reasons"
        label={t('intake.review.reasons')}
        value={reasons}
        onChange={(e) => {
          setReasons(e.currentTarget.value);
        }}
      />
      {decision === 'accepted_with_conditions' ? (
        <>
          {conditions.map((c, n) => (
            // Rows have no id while typed; the index is the row here.
            <div key={n} className="ocs-stack">
              <SelectField
                id={`cond-${String(n)}-item`}
                label={`${t('intake.review.item')} ${String(n + 1)}`}
                value={c.itemCode}
                options={props.codes.map((code) => ({ value: code, label: code }))}
                onChange={(e) => {
                  setRow(n, { itemCode: e.currentTarget.value });
                }}
              />
              <TextField
                id={`cond-${String(n)}-text`}
                label={`${t('intake.review.what')} ${String(n + 1)}`}
                value={c.text}
                onChange={(e) => {
                  setRow(n, { text: e.currentTarget.value });
                }}
              />
              <TextField
                id={`cond-${String(n)}-deadline`}
                label={`${t('intake.review.deadline')} ${String(n + 1)}`}
                type="date"
                value={c.deadline}
                onChange={(e) => {
                  setRow(n, { deadline: e.currentTarget.value });
                }}
              />
            </div>
          ))}
          <div>
            <Button
              type="button"
              onClick={() => {
                setConditions((cs) => [...cs, { itemCode: props.codes[0] ?? 'A1', text: '', deadline: '' }]);
              }}
            >
              {t('intake.review.addCondition')}
            </Button>
          </div>
        </>
      ) : null}
      <div>
        <Button type="submit">{t('intake.review.save')}</Button>
      </div>
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
          {t(`intake.review.outcome.${outcome}`)}
        </FormMessage>
      ) : null}
    </Form>
  );
}
