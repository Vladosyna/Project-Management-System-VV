// Intake dispute on the Intake tab (SOP-DEL-01 §9): when the Delivery Director returns a card, Sales may dispute
// it once with a reason; the sponsor upholds or overturns within 2 working days. The API decides who may do what
// (Sales raises, the sponsor decides); this block only shows the state and offers both forms.
import { useState } from 'react';
import { Button, Form, FormMessage, TextField, useI18n } from '@ocs/ui';
import { intakeWrite, type HandoverCardView } from '../api.ts';

type Outcome = 'ok' | 'forbidden' | 'invalid' | 'rule' | 'conflict' | 'failed';

export function IntakeDispute(props: { siteId: string; card: HandoverCardView; onDone: () => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const dispute = props.card.dispute;
  const returned = props.card.status === 'returned';
  if (!dispute && !returned) return null;

  const run = async (path: 'intake-dispute' | 'intake-dispute/decide', body: Record<string, unknown>) => {
    setOutcome(null);
    try {
      const r = await intakeWrite(props.siteId, path, body);
      setOutcome(r);
      if (r === 'ok') props.onDone();
    } catch {
      setOutcome('failed');
    }
  };
  const message = outcome ? (
    <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
      {t(`intake.dispute.outcome.${outcome}`)}
    </FormMessage>
  ) : null;

  if (dispute?.outcome) {
    return (
      <section>
        <h3>{t('intake.dispute.title')}</h3>
        <p>{t(`intake.dispute.${dispute.outcome}`, { note: dispute.note ?? '' })}</p>
      </section>
    );
  }
  if (dispute) {
    const decide = (o: 'upheld' | 'overturned') =>
      void run('intake-dispute/decide', { outcome: o, ...(note.trim() ? { note: note.trim() } : {}) });
    return (
      <section>
        <h3>{t('intake.dispute.title')}</h3>
        <p>{t('intake.dispute.open', { reason: dispute.reason, dueOn: dispute.dueOn })}</p>
        <TextField
          id="dispute-note"
          label={t('intake.dispute.note')}
          value={note}
          onChange={(e) => {
            setNote(e.currentTarget.value);
          }}
        />
        <div>
          <Button
            type="button"
            onClick={() => {
              decide('upheld');
            }}
          >
            {t('intake.dispute.uphold')}
          </Button>{' '}
          <Button
            type="button"
            onClick={() => {
              decide('overturned');
            }}
          >
            {t('intake.dispute.overturn')}
          </Button>
        </div>
        {message}
      </section>
    );
  }
  return (
    <Form onSubmit={() => run('intake-dispute', { reason })}>
      <h3>{t('intake.dispute.title')}</h3>
      <TextField
        id="dispute-reason"
        label={t('intake.dispute.reason')}
        value={reason}
        onChange={(e) => {
          setReason(e.currentTarget.value);
        }}
      />
      <div>
        <Button type="submit">{t('intake.dispute.raise')}</Button>
      </div>
      {message}
    </Form>
  );
}
