// /projects — E11 AC3 (D-34 C5): the programme tracker that replaces the hand-kept Excel tracker, laid out as the
// "Markets & gates" tab of the Project mockup — projects grouped by country, each with stage, planned installation,
// R9 readiness, its gates and, for roles that see commercial data, client PO and DPIA (E13). Filters: client and
// country. Each Project ID opens that project's Lifecycle tab; "Export CSV" downloads what is shown, for the people
// who still keep the Excel tracker until it is retired (D-19). Every string is an i18n key (ocs-ui-screen).
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button, Card, FormMessage, PageHeader, SelectField, StatusChip, TextField, useI18n } from '@ocs/ui';
import {
  loadCommercialPortfolio,
  loadPortfolio,
  loadProgrammeTracker,
  type ClientSummary,
  type CommercialPortfolioRow,
  type ProgrammeTrackerRow,
} from '../api.ts';
import { trackerCsv } from '../tracker-csv.ts';
import { STEP_LABELS } from './site-lifecycle.tsx';

interface Data {
  rows: ProgrammeTrackerRow[];
  clients: ClientSummary[];
  /** Undefined when the role may not see commercial data: the PO and DPIA columns are left out. */
  commercial: Map<string, CommercialPortfolioRow> | undefined;
}

type Dpia = 'pending' | 'approved' | 'rejected';
const GATE_TONE = { passed: 'ok', current: 'progress', not_started: 'wait' } as const;
const ALL = '';

export function ProjectsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Data | 'forbidden' | 'failed' | null>(null);
  const [clientId, setClientId] = useState(ALL);
  const [country, setCountry] = useState('');
  useEffect(() => {
    Promise.all([loadProgrammeTracker(), loadPortfolio(), loadCommercialPortfolio()]).then(
      ([rows, portfolio, commercial]) => {
        setData(
          rows
            ? {
                rows,
                clients: portfolio.clients,
                commercial: commercial && new Map(commercial.map((c) => [c.siteId, c])),
              }
            : 'forbidden',
        );
      },
      () => {
        setData('failed');
      },
    );
  }, []);

  const loaded = typeof data === 'object' && data !== null ? data : null;
  const wanted = country.trim().toUpperCase();
  const shown = loaded
    ? loaded.rows.filter(
        (r) => (clientId === ALL || r.clientId === clientId) && (wanted === '' || r.countryCode === wanted),
      )
    : [];
  const countries = [...new Set(shown.map((r) => r.countryCode))].sort();
  const poText = (money: CommercialPortfolioRow | undefined) =>
    money && money.poCount > 0
      ? t('commercial.overview.poLine', { count: String(money.poCount), eur: money.poEur })
      : t('commercial.overview.missing');
  const dpiaText = (money: CommercialPortfolioRow | undefined) =>
    money?.dpia ? t(`commercial.status.${money.dpia as Dpia}`) : t('commercial.overview.missing');
  const label = (key: string): string => {
    const [head, rest] = key.split('.') as [string, string | undefined];
    if (head === 'stage') {
      const step = rest ? STEP_LABELS[rest] : undefined;
      return step ? t(step) : (rest ?? '');
    }
    if (head === 'gate') return t(`lifecycle.gate.${rest as 'passed' | 'current' | 'not_started'}`);
    const fixed = {
      projectId: t('portfolio.col.projectId'),
      site: t('portfolio.col.site'),
      country: t('projects.filter.country'),
      city: t('portfolio.col.city'),
      standard: t('portfolio.col.standard'),
      stage: t('projects.col.stage'),
      planned: t('lifecycle.planned'),
      daysTo: t('projects.col.daysTo'),
      readiness: t('projects.col.readiness'),
      atRisk: t('lifecycle.readinessAtRisk'),
      po: t('commercial.kind.client_po'),
      dpia: t('commercial.kind.dpia'),
    } as Record<string, string>;
    return fixed[key] ?? key;
  };
  const exportCsv = () => {
    const commercial = loaded?.commercial;
    const csv = trackerCsv(shown, {
      label,
      commercial:
        commercial &&
        new Map(
          shown.map((r) => [
            r.siteId,
            { po: poText(commercial.get(r.siteId)), dpia: dpiaText(commercial.get(r.siteId)) },
          ]),
        ),
    });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `programme-tracker${wanted ? `-${wanted}` : ''}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader eyebrow={`/ ${t('projects.title')}`} title={t('projects.title')} />
      <Card>
        <p>{t('projects.intro')}</p>
        {data === null ? <p>{t('common.loading')}</p> : null}
        {data === 'forbidden' ? <p>{t('projects.noAccess')}</p> : null}
        {data === 'failed' ? <FormMessage tone="error">{t('projects.failed')}</FormMessage> : null}
        {loaded ? (
          <>
            <SelectField
              id="projects-client"
              label={t('projects.filter.client')}
              value={clientId}
              options={[
                { value: ALL, label: t('projects.filter.allClients') },
                ...loaded.clients.map((c) => ({ value: c.id, label: `${c.shortCode} — ${c.name}` })),
              ]}
              onChange={(e) => {
                setClientId(e.currentTarget.value);
              }}
            />
            <TextField
              id="projects-country"
              label={t('projects.filter.country')}
              hint={t('projects.filter.countryHint')}
              maxLength={2}
              value={country}
              onChange={(e) => {
                setCountry(e.currentTarget.value);
              }}
            />
            {shown.length === 0 ? (
              <p>{t('projects.empty')}</p>
            ) : (
              <Button type="button" variant="secondary" onClick={exportCsv}>
                {t('projects.export')}
              </Button>
            )}
          </>
        ) : null}
      </Card>
      {loaded
        ? countries.map((cc) => {
            const rows = shown.filter((r) => r.countryCode === cc);
            return (
              <Card key={cc} title={t('projects.country', { country: cc, count: String(rows.length) })}>
                <table className="ocs-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('portfolio.col.projectId')}</th>
                      <th scope="col">{t('portfolio.col.site')}</th>
                      <th scope="col">{t('portfolio.col.city')}</th>
                      <th scope="col">{t('portfolio.col.standard')}</th>
                      <th scope="col">{t('projects.col.stage')}</th>
                      <th scope="col">{t('lifecycle.planned')}</th>
                      <th scope="col">{t('projects.col.gates')}</th>
                      {loaded.commercial ? (
                        <>
                          <th scope="col">{t('commercial.kind.client_po')}</th>
                          <th scope="col">{t('commercial.kind.dpia')}</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const money = loaded.commercial?.get(r.siteId);
                      const stage = r.stage ? STEP_LABELS[r.stage] : undefined;
                      return (
                        <tr key={r.siteId}>
                          <td>
                            <Link to="/sites/$siteId/$tab" params={{ siteId: r.siteId, tab: 'lifecycle' }}>
                              {r.projectId}
                            </Link>
                          </td>
                          <td>{r.name}</td>
                          <td>{r.cityName}</td>
                          <td>{r.standard}</td>
                          <td>{stage ? t(stage) : t('projects.notStarted')}</td>
                          <td>
                            {r.plannedInstallationDate ?? '—'}
                            {r.workingDaysToInstallation !== null && r.workingDaysToInstallation >= 0
                              ? ` · ${t('lifecycle.daysTo', { days: String(r.workingDaysToInstallation) })}`
                              : ''}
                            {r.readinessAtRisk ? (
                              <div>
                                <StatusChip tone="escalated" /> {t('lifecycle.readinessAtRisk')}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            {r.gates.length === 0 ? (
                              '—'
                            ) : (
                              <ul className="ocs-board__list">
                                {r.gates.map((g) => (
                                  <li key={g.key}>
                                    <span className={`ocs-chip ocs-chip--${GATE_TONE[g.status]}`}>
                                      {t(`lifecycle.gate.${g.status}`)}
                                    </span>{' '}
                                    {g.name}
                                    {g.doneOn ? ` · ${g.doneOn}` : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          {loaded.commercial ? (
                            <>
                              <td>{poText(money)}</td>
                              <td>{dpiaText(money)}</td>
                            </>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })
        : null}
    </>
  );
}
