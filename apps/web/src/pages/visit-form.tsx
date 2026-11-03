// "Record a visit" on the Site page (E5 AC3): the same-day record in the order of the DingTalk Action
// Record template (SOP-DEL-03 §5.1). Rules (coverage X ≤ Y, a reason for a shortfall, an owner and a date
// for every action, not in the future) are enforced by work.visit.record; the form only collects.
import { useState } from 'react';
import { Button, CheckboxGroup, Form, FormMessage, SelectField, TextArea, TextField, useI18n } from '@ocs/ui';
import { recordVisit, type StaffMember, type VisitInput } from '../api.ts';

const TYPES = [
  'site_survey',
  'technical_inspection',
  'installation',
  'commissioning',
  'maintenance',
] as const;
const SIDES = ['vv', 'client', 'third_party'] as const;
type Side = (typeof SIDES)[number];

/** One text line per entry; blank lines are dropped. */
const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export function VisitForm(props: { siteId: string; staff: StaffMember[]; onDone: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>('technical_inspection');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState<{ name: string; side: Side }[]>([{ name: '', side: 'vv' }]);
  const [summary, setSummary] = useState('');
  const [decided, setDecided] = useState('');
  const [agreedWith, setAgreedWith] = useState('');
  const [discussed, setDiscussed] = useState('');
  const [done, setDone] = useState('');
  const [total, setTotal] = useState('');
  const [gap, setGap] = useState('');
  const [action, setAction] = useState({ title: '', owner: props.staff[0]?.id ?? '', due: '' });
  const [minutesRef, setMinutesRef] = useState('');
  const [escalate, setEscalate] = useState<string[]>([]);
  const [error, setError] = useState<'failed' | 'rejected' | null>(null);

  if (!open) {
    return (
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('visit.record')}
      </Button>
    );
  }

  const submit = async () => {
    setError(null);
    const input: VisitInput = {
      type,
      visitDate,
      attendees: attendees.filter((a) => a.name.trim() !== ''),
      summary,
      decided: lines(decided).map((text) => ({ text, agreedWith })),
      discussed: lines(discussed),
      coverage: { done: Number(done), total: Number(total), ...(gap.trim() ? { gap } : {}) },
      actions: action.title.trim()
        ? [{ title: action.title, owner: { userId: action.owner }, due: action.due }]
        : [],
      escalate: escalate.length > 0,
      ...(minutesRef.trim() ? { minutesRef } : {}),
    };
    try {
      const outcome = await recordVisit(props.siteId, input);
      if (outcome !== 'ok') {
        setError('rejected');
        return;
      }
      setOpen(false);
      props.onDone();
    } catch {
      setError('failed');
    }
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, type = 'text') => (
    <TextField
      id={id}
      type={type}
      label={label}
      value={value}
      onChange={(e) => {
        set(e.currentTarget.value);
      }}
    />
  );

  return (
    <Form onSubmit={submit}>
      <SelectField
        id="visit-type"
        label={t('visit.type')}
        value={type}
        options={TYPES.map((v) => ({ value: v, label: t(`visit.type.${v}`) }))}
        onChange={(e) => {
          setType(e.currentTarget.value as (typeof TYPES)[number]);
        }}
      />
      {field('visit-date', t('visit.date'), visitDate, setVisitDate, 'date')}
      {attendees.map((a, i) => (
        <div key={i} className="ocs-board">
          {field(`attendee-${String(i)}`, t('visit.attendee'), a.name, (name) => {
            setAttendees(attendees.map((x, j) => (j === i ? { ...x, name } : x)));
          })}
          <SelectField
            id={`side-${String(i)}`}
            label={t('visit.side')}
            value={a.side}
            options={SIDES.map((v) => ({ value: v, label: t(`visit.side.${v}`) }))}
            onChange={(e) => {
              const side = e.currentTarget.value as Side;
              setAttendees(attendees.map((x, j) => (j === i ? { ...x, side } : x)));
            }}
          />
        </div>
      ))}
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            setAttendees([...attendees, { name: '', side: 'client' }]);
          }}
        >
          {t('visit.addAttendee')}
        </Button>
      </div>
      <TextArea
        id="visit-summary"
        label={t('visit.summary')}
        value={summary}
        onChange={(e) => {
          setSummary(e.currentTarget.value);
        }}
      />
      <TextArea
        id="visit-decided"
        label={t('visit.decided')}
        value={decided}
        onChange={(e) => {
          setDecided(e.currentTarget.value);
        }}
      />
      {field('visit-agreed-with', t('visit.agreedWith'), agreedWith, setAgreedWith)}
      <TextArea
        id="visit-discussed"
        label={t('visit.discussed')}
        value={discussed}
        onChange={(e) => {
          setDiscussed(e.currentTarget.value);
        }}
      />
      {field('visit-done', t('visit.coverageDone'), done, setDone, 'number')}
      {field('visit-total', t('visit.coverageTotal'), total, setTotal, 'number')}
      {field('visit-gap', t('visit.coverageGap'), gap, setGap)}
      {field('visit-action', t('visit.actionTitle'), action.title, (title) => {
        setAction({ ...action, title });
      })}
      <SelectField
        id="visit-action-owner"
        label={t('site.actionOwner')}
        value={action.owner}
        options={props.staff.map((s) => ({ value: s.id, label: s.name }))}
        onChange={(e) => {
          setAction({ ...action, owner: e.currentTarget.value });
        }}
      />
      {field(
        'visit-action-due',
        t('site.actionDue'),
        action.due,
        (due) => {
          setAction({ ...action, due });
        },
        'date',
      )}
      {field('visit-minutes', t('visit.minutes'), minutesRef, setMinutesRef)}
      <CheckboxGroup
        legend={t('visit.escalation')}
        options={[{ id: 'escalate', label: t('visit.escalate') }]}
        value={escalate}
        onChange={setEscalate}
      />
      {error ? (
        <FormMessage tone="error">{t(error === 'rejected' ? 'visit.rejected' : 'visit.failed')}</FormMessage>
      ) : null}
      <div>
        <Button type="submit">{t('visit.save')}</Button>
      </div>
    </Form>
  );
}
