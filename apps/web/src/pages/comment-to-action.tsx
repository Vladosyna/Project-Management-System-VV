// "Make it an action" under a comment on the Site timeline (E5 AC2): owner — a staff member or a named
// person outside OCS — and a due date (SOP-DEL-03 "every action gets an owner and a date").
import { useState } from 'react';
import { Button, Form, FormMessage, SelectField, TextField, useI18n } from '@ocs/ui';
import { commentToAction, type StaffMember } from '../api.ts';

const OUTSIDE = 'outside';

export function CommentToAction(props: { commentId: string; staff: StaffMember[]; onDone: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState(props.staff[0]?.id ?? OUTSIDE);
  const [outsideName, setOutsideName] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<'failed' | 'forbidden' | null>(null);

  if (!open) {
    return (
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('site.toAction')}
      </Button>
    );
  }

  const ready = due !== '' && (owner !== OUTSIDE || outsideName.trim() !== '');
  const submit = async () => {
    setError(null);
    try {
      const who = owner === OUTSIDE ? { name: outsideName.trim() } : { userId: owner };
      if ((await commentToAction(props.commentId, who, due)) === 'forbidden') {
        setError('forbidden');
        return;
      }
      setOpen(false);
      props.onDone();
    } catch {
      setError('failed');
    }
  };

  return (
    <Form onSubmit={submit}>
      <SelectField
        id={`owner-${props.commentId}`}
        label={t('site.actionOwner')}
        value={owner}
        options={[
          ...props.staff.map((s) => ({ value: s.id, label: s.name })),
          { value: OUTSIDE, label: t('site.actionOutside') },
        ]}
        onChange={(e) => {
          setOwner(e.currentTarget.value);
        }}
      />
      {owner === OUTSIDE ? (
        <TextField
          id={`outside-${props.commentId}`}
          label={t('site.actionOutsideName')}
          value={outsideName}
          onChange={(e) => {
            setOutsideName(e.currentTarget.value);
          }}
        />
      ) : null}
      <TextField
        id={`due-${props.commentId}`}
        type="date"
        label={t('site.actionDue')}
        value={due}
        onChange={(e) => {
          setDue(e.currentTarget.value);
        }}
      />
      {error ? (
        <FormMessage tone="error">
          {t(error === 'forbidden' ? 'site.actionForbidden' : 'site.actionFailed')}
        </FormMessage>
      ) : null}
      <div>
        <Button type="submit" disabled={!ready}>
          {t('site.createAction')}
        </Button>
      </div>
    </Form>
  );
}
