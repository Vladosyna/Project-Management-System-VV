// Actions tab of a project (E5 AC1, D-36 — Vlad 23 Nov: "leave a task in a project for a specific PM and track it to
// done"): the open actions with owner, due date and overdue mark; a new task for a staff member; Done for the
// owner, a director or a PM. The API decides who may do what; this tab only shows its answer.
import { useEffect, useState } from 'react';
import { Button, Form, FormMessage, SelectField, StatusChip, TextField, useI18n } from '@ocs/ui';
import {
  completeActionOf,
  createSiteAction,
  loadSiteActions,
  loadStaff,
  type OpenAction,
  type StaffMember,
} from '../api.ts';

type Outcome = 'ok' | 'forbidden' | 'invalid' | 'failed';

export function SiteActions(props: { siteId: string }) {
  const { t } = useI18n();
  const [actions, setActions] = useState<OpenAction[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [version, setVersion] = useState(0);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    loadSiteActions(props.siteId).then(setActions, () => {
      setActions([]);
    });
  }, [props.siteId, version]);
  useEffect(() => {
    loadStaff().then(
      (s) => {
        setStaff(s);
        setOwner((o) => o || (s[0]?.id ?? ''));
      },
      () => {
        setStaff([]);
      },
    );
  }, []);

  const run = async (write: () => Promise<'ok' | 'forbidden' | 'invalid'>) => {
    setOutcome(null);
    try {
      const r = await write();
      setOutcome(r);
      if (r === 'ok') setVersion((v) => v + 1);
      return r;
    } catch {
      setOutcome('failed');
      return 'failed';
    }
  };
  const create = async () => {
    if (
      (await run(() => createSiteAction(props.siteId, { title, owner: { userId: owner }, due }))) === 'ok'
    ) {
      setTitle('');
      setDue('');
    }
  };

  return (
    <>
      {actions === null ? <p>{t('common.loading')}</p> : null}
      {actions?.length === 0 ? <p>{t('site.noActions')}</p> : null}
      <ul className="ocs-board__list">
        {(actions ?? []).map((a) => (
          <li key={a.id} className="ocs-board__card">
            <div className="ocs-board__title">{a.title}</div>
            <div className="ocs-board__meta">
              {a.owner.name ?? ''} · {a.due} {a.overdue ? <StatusChip tone="escalated" /> : null}
            </div>
            <Button
              variant="secondary"
              aria-label={`${t('task.done')}: ${a.title}`}
              onClick={() => void run(() => completeActionOf(a.id))}
            >
              {t('task.done')}
            </Button>
          </li>
        ))}
      </ul>
      <Form onSubmit={create}>
        <h3>{t('task.new')}</h3>
        <TextField
          id="task-title"
          label={t('task.title')}
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
          }}
        />
        <SelectField
          id="task-owner"
          label={t('task.owner')}
          value={owner}
          options={staff.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(e) => {
            setOwner(e.currentTarget.value);
          }}
        />
        <TextField
          id="task-due"
          type="date"
          label={t('task.due')}
          value={due}
          onChange={(e) => {
            setDue(e.currentTarget.value);
          }}
        />
        <div>
          <Button type="submit">{t('task.create')}</Button>
        </div>
      </Form>
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>{t(`task.outcome.${outcome}`)}</FormMessage>
      ) : null}
    </>
  );
}
