// /commercial — E13 overview (Vlad 26 Nov): the commercial status of every project the user may see — confirmed PO and
// invoice totals in EUR, DPIA, price-list price, AI proposals waiting — and each Project ID opens that project's
// Commercial tab with the details. Every string is an i18n key (ocs-ui-screen).
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card, FormMessage, PageHeader, useI18n } from '@ocs/ui';
import { loadCommercialPortfolio, type CommercialPortfolioRow } from '../api.ts';

type Dpia = 'pending' | 'approved' | 'rejected';

export function CommercialPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<CommercialPortfolioRow[] | 'forbidden' | 'failed' | null>(null);
  useEffect(() => {
    loadCommercialPortfolio().then(
      (r) => {
        setRows(r ?? 'forbidden');
      },
      () => {
        setRows('failed');
      },
    );
  }, []);
  return (
    <>
      <PageHeader eyebrow={`/ ${t('commercial.title')}`} title={t('commercial.title')} />
      <Card>
        <p>{t('commercial.overview.intro')}</p>
        {rows === null ? <p>{t('common.loading')}</p> : null}
        {rows === 'forbidden' ? <p>{t('commercial.noAccess')}</p> : null}
        {rows === 'failed' ? <FormMessage tone="error">{t('commercial.overview.failed')}</FormMessage> : null}
        {Array.isArray(rows) ? (
          <table className="ocs-table">
            <thead>
              <tr>
                <th scope="col">{t('commercial.overview.project')}</th>
                <th scope="col">{t('commercial.overview.po')}</th>
                <th scope="col">{t('commercial.overview.invoiced')}</th>
                <th scope="col">{t('commercial.overview.paid')}</th>
                <th scope="col">{t('commercial.kind.dpia')}</th>
                <th scope="col">{t('commercial.kind.price_list')}</th>
                <th scope="col">{t('commercial.overview.proposals')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.siteId}>
                  <td>
                    <Link to="/sites/$siteId/$tab" params={{ siteId: r.siteId, tab: 'commercial' }}>
                      {r.projectId}
                    </Link>
                  </td>
                  <td>{t('commercial.overview.poLine', { count: String(r.poCount), eur: r.poEur })}</td>
                  <td>{t('commercial.overview.eur', { eur: r.invoicedEur })}</td>
                  <td>{t('commercial.overview.eur', { eur: r.paidEur })}</td>
                  <td>
                    {r.dpia ? t(`commercial.status.${r.dpia as Dpia}`) : t('commercial.overview.missing')}
                  </td>
                  <td>{r.priceEur ? t('commercial.overview.eur', { eur: r.priceEur }) : '—'}</td>
                  <td>{r.proposals > 0 ? String(r.proposals) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Card>
    </>
  );
}
