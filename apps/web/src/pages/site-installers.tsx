// Installers tab of a project (E12, D-34 N1): each installer job with its quotes cheapest first in EUR (the quote
// comparison), Confirm for quotes an AI agent proposed, the CEO's approval of the chosen quote (P-11: reference; P-12:
// a reason when there is only one comparable quote) and the job status. The API decides who may do what. Staff only.
import { useEffect, useState } from 'react';
import { Button, Form, FormMessage, SelectField, TextField, useI18n } from '@ocs/ui';
import { installerWrite, loadInstallerJobs, type InstallerJob } from '../api.ts';

type Outcome = 'ok' | 'forbidden' | 'invalid' | 'rule' | 'conflict' | 'failed';
const NEXT = ['scheduled', 'done', 'attended_not_ready', 'cancelled'] as const;
type Next = (typeof NEXT)[number];
type Status = 'planned' | 'quoting' | 'approved' | Next;

function JobCard(props: { job: InstallerJob; onDone: () => void }) {
  const { t } = useI18n();
  const { job } = props;
  const [quoteId, setQuoteId] = useState(job.quotes.find((q) => q.confirmed)?.id ?? '');
  const [ref, setRef] = useState('');
  const [approvedOn, setApprovedOn] = useState('');
  const [reason, setReason] = useState('');
  const [next, setNext] = useState<Next>('scheduled');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const run = async (path: string, body: Record<string, unknown>) => {
    setOutcome(null);
    try {
      const r = await installerWrite(path, body);
      setOutcome(r);
      if (r === 'ok') props.onDone();
    } catch {
      setOutcome('failed');
    }
  };
  const id = encodeURIComponent(job.id);
  return (
    <section className="ocs-stack">
      <h3>
        {t('installers.job', {
          scope: t(`installers.scope.${job.scope}`),
          sensors: String(job.sensorCount),
          status: t(`installers.status.${job.status as Status}`),
        })}
      </h3>
      {job.quotes.length === 0 ? <p>{t('installers.noQuotes')}</p> : null}
      {job.quotes.length > 0 ? (
        <table className="ocs-table">
          <thead>
            <tr>
              <th scope="col">{t('installers.col.installer')}</th>
              <th scope="col">{t('installers.col.amount')}</th>
              <th scope="col">{t('installers.col.eur')}</th>
              <th scope="col">{t('installers.col.valid')}</th>
              <th scope="col">{t('installers.col.state')}</th>
            </tr>
          </thead>
          <tbody>
            {job.quotes.map((q) => (
              <tr key={q.id}>
                <td>{q.installer}</td>
                <td>{`${q.amount} ${q.currency}`}</td>
                <td>{t('commercial.overview.eur', { eur: q.eur })}</td>
                <td>{q.validUntil ?? ''}</td>
                <td>
                  {q.confirmed ? (
                    t('installers.confirmed')
                  ) : (
                    <Button
                      variant="secondary"
                      aria-label={`${t('commercial.confirm')}: ${q.installer}`}
                      onClick={() => void run(`installer-quotes/${encodeURIComponent(q.id)}/confirm`, {})}
                    >
                      {t('commercial.confirm')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {job.status === 'planned' || job.status === 'quoting' ? (
        <Form
          onSubmit={() =>
            run(`installer-jobs/${id}/approval`, {
              quoteId,
              approvalRef: ref,
              approvedOn,
              ...(reason.trim() ? { singleQuoteReason: reason.trim() } : {}),
            })
          }
        >
          <h4>{t('installers.approval')}</h4>
          <SelectField
            id={`approve-quote-${job.id}`}
            label={t('installers.chosen')}
            value={quoteId}
            options={job.quotes
              .filter((q) => q.confirmed)
              .map((q) => ({ value: q.id, label: `${q.installer} — ${q.eur} EUR` }))}
            onChange={(e) => {
              setQuoteId(e.currentTarget.value);
            }}
          />
          <TextField
            id={`approve-ref-${job.id}`}
            label={t('installers.approvalRef')}
            value={ref}
            onChange={(e) => {
              setRef(e.currentTarget.value);
            }}
          />
          <TextField
            id={`approve-date-${job.id}`}
            type="date"
            label={t('installers.approvedOn')}
            value={approvedOn}
            onChange={(e) => {
              setApprovedOn(e.currentTarget.value);
            }}
          />
          <TextField
            id={`approve-reason-${job.id}`}
            label={t('installers.singleReason')}
            value={reason}
            onChange={(e) => {
              setReason(e.currentTarget.value);
            }}
          />
          <div>
            <Button type="submit">{t('installers.recordApproval')}</Button>
          </div>
        </Form>
      ) : null}
      {job.status !== 'done' && job.status !== 'cancelled' && job.status !== 'attended_not_ready' ? (
        <Form
          onSubmit={() =>
            run(`installer-jobs/${id}/status`, {
              status: next,
              ...(date ? { scheduledOn: date } : {}),
              ...(note.trim() ? { note: note.trim() } : {}),
            })
          }
        >
          <SelectField
            id={`status-${job.id}`}
            label={t('installers.newStatus')}
            value={next}
            options={NEXT.map((s) => ({ value: s, label: t(`installers.status.${s}`) }))}
            onChange={(e) => {
              setNext(e.currentTarget.value as Next);
            }}
          />
          {next === 'scheduled' ? (
            <TextField
              id={`status-date-${job.id}`}
              type="date"
              label={t('installers.scheduledOn')}
              value={date}
              onChange={(e) => {
                setDate(e.currentTarget.value);
              }}
            />
          ) : (
            <TextField
              id={`status-note-${job.id}`}
              label={t('installers.note')}
              value={note}
              onChange={(e) => {
                setNote(e.currentTarget.value);
              }}
            />
          )}
          <div>
            <Button type="submit">{t('installers.saveStatus')}</Button>
          </div>
        </Form>
      ) : null}
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
          {t(`installers.outcome.${outcome}`)}
        </FormMessage>
      ) : null}
    </section>
  );
}

export function SiteInstallers(props: { siteId: string }) {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<InstallerJob[] | 'forbidden' | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadInstallerJobs(props.siteId).then(
      (j) => {
        setJobs(j ?? 'forbidden');
      },
      () => {
        setJobs([]);
      },
    );
  }, [props.siteId, version]);
  if (jobs === null) return <p>{t('common.loading')}</p>;
  if (jobs === 'forbidden') return <p>{t('commercial.noAccess')}</p>;
  if (jobs.length === 0) return <p>{t('installers.none')}</p>;
  return (
    <>
      {jobs.map((j) => (
        <JobCard
          key={j.id}
          job={j}
          onDone={() => {
            setVersion((v) => v + 1);
          }}
        />
      ))}
    </>
  );
}
