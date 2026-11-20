// Conditional Start on the Intake tab (E2 AC4, SOP-DEL-01 §9): before acceptance, the sponsor authorises Delivery
// to start, naming the missing items, the written DingTalk reference and a deadline within 5 working days. The
// API refuses every other role; once authorised, it is shown.
import { useState } from 'react';
import { Button, CheckboxGroup, Form, FormMessage, TextField, useI18n } from '@ocs/ui';
import { intakeWrite, type HandoverCardView } from '../api.ts';

type Outcome = 'ok' | 'forbidden' | 'invalid' | 'rule' | 'conflict' | 'failed';

export function ConditionalStart(props: {
  siteId: string;
  card: HandoverCardView;
  codes: readonly string[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [ref, setRef] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const start = props.card.conditionalStart;
  if (start) {
    return (
      <p>
        {t('intake.start.done', {
          items: start.missingItems.join(', '),
          deadline: start.deadline,
          ref: start.writtenRef,
        })}
      </p>
    );
  }
  if (props.card.status !== 'draft' && props.card.status !== 'submitted') return null;
  const submit = async () => {
    setOutcome(null);
    try {
      const r = await intakeWrite(props.siteId, 'conditional-start', {
        missingItems: items,
        deadline,
        writtenRef: ref,
      });
      setOutcome(r);
      if (r === 'ok') props.onDone();
    } catch {
      setOutcome('failed');
    }
  };
  return (
    <Form onSubmit={submit}>
      <h3>{t('intake.start.title')}</h3>
      <CheckboxGroup
        legend={t('intake.start.items')}
        options={props.codes.map((code) => ({ id: code, label: code }))}
        value={items}
        onChange={setItems}
      />
      <TextField
        id="start-deadline"
        label={t('intake.start.deadline')}
        type="date"
        value={deadline}
        onChange={(e) => {
          setDeadline(e.currentTarget.value);
        }}
      />
      <TextField
        id="start-ref"
        label={t('intake.start.ref')}
        value={ref}
        onChange={(e) => {
          setRef(e.currentTarget.value);
        }}
      />
      <div>
        <Button type="submit">{t('intake.start.save')}</Button>
      </div>
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
          {t(`intake.start.outcome.${outcome}`)}
        </FormMessage>
      ) : null}
    </Form>
  );
}
