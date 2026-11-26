// Commercial tab of a project (E13, D-34 N2): client PO, DPIA, client invoice and price-list price, each amount in its
// own currency and in EUR with the rate used (Vlad 23 Nov). An AI agent's entry shows as "Proposed" until a person
// confirms it; a person's entry is confirmed at once. Wrong records are archived with a reason. Staff only.
import { useEffect, useState } from 'react';
import { Button, Form, FormMessage, SelectField, TextField, useI18n } from '@ocs/ui';
import {
  addCommercial,
  archiveCommercial,
  confirmCommercial,
  loadCommercial,
  type CommercialRecord,
} from '../api.ts';

const KINDS = ['client_po', 'dpia', 'client_invoice', 'price_list'] as const;
type Kind = (typeof KINDS)[number];
type Status = 'received' | 'pending' | 'approved' | 'rejected' | 'issued' | 'paid';
const STATUSES: Record<Kind, readonly Status[]> = {
  client_po: ['received'],
  dpia: ['pending', 'approved', 'rejected'],
  client_invoice: ['issued', 'paid'],
  price_list: ['received'],
};
type Outcome = 'ok' | 'forbidden' | 'invalid' | 'failed';

export function SiteCommercial(props: { siteId: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<CommercialRecord[] | 'forbidden' | null>(null);
  const [version, setVersion] = useState(0);
  const [kind, setKind] = useState<Kind>('client_po');
  const [status, setStatus] = useState<Status>('received');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [rate, setRate] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    loadCommercial(props.siteId).then(
      (r) => {
        setRows(r ?? 'forbidden');
      },
      () => {
        setRows([]);
      },
    );
  }, [props.siteId, version]);

  const run = async (write: () => Promise<'ok' | 'forbidden' | 'invalid'>) => {
    setOutcome(null);
    try {
      const r = await write();
      setOutcome(r);
      if (r === 'ok') setVersion((v) => v + 1);
    } catch {
      setOutcome('failed');
    }
  };
  const add = () => {
    const cur = currency.trim().toUpperCase();
    const money =
      kind === 'dpia' || amount.trim() === ''
        ? {}
        : {
            money: {
              amount: amount.trim(),
              currency: cur,
              ...(cur === 'EUR' ? {} : { fxRate: rate.trim(), fxDate: date, fxSource: 'manual' }),
            },
          };
    return run(() =>
      addCommercial(props.siteId, {
        kind,
        status,
        recordDate: date,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...money,
      }),
    );
  };

  if (rows === null) return <p>{t('common.loading')}</p>;
  if (rows === 'forbidden') return <p>{t('commercial.noAccess')}</p>;
  return (
    <>
      {rows.length === 0 ? <p>{t('commercial.none')}</p> : null}
      {rows.length > 0 ? (
        <table className="ocs-table">
          <thead>
            <tr>
              <th scope="col">{t('commercial.col.kind')}</th>
              <th scope="col">{t('commercial.col.reference')}</th>
              <th scope="col">{t('commercial.col.status')}</th>
              <th scope="col">{t('commercial.col.date')}</th>
              <th scope="col">{t('commercial.col.amount')}</th>
              <th scope="col">{t('commercial.col.eur')}</th>
              <th scope="col">{t('commercial.col.do')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{t(`commercial.kind.${r.kind}`)}</td>
                <td>{r.reference ?? ''}</td>
                <td>
                  {t(`commercial.status.${r.status as Status}`)}
                  {r.confirmed ? '' : ` · ${t('commercial.proposed')}`}
                </td>
                <td>{r.recordDate}</td>
                <td>{r.money ? `${r.money.amount} ${r.money.currency}` : ''}</td>
                <td>
                  {r.money
                    ? t('commercial.eurLine', {
                        eur: r.money.eur,
                        rate: r.money.fxRate,
                        date: r.money.fxDate,
                      })
                    : ''}
                </td>
                <td>
                  {r.confirmed ? null : (
                    <Button
                      variant="secondary"
                      aria-label={`${t('commercial.confirm')}: ${r.reference ?? r.kind}`}
                      onClick={() => void run(() => confirmCommercial(r.id))}
                    >
                      {t('commercial.confirm')}
                    </Button>
                  )}{' '}
                  <Button
                    variant="secondary"
                    aria-label={`${t('commercial.archive')}: ${r.reference ?? r.kind}`}
                    onClick={() => void run(() => archiveCommercial(r.id, t('commercial.archiveReason')))}
                  >
                    {t('commercial.archive')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <Form onSubmit={add}>
        <h3>{t('commercial.add')}</h3>
        <SelectField
          id="commercial-kind"
          label={t('commercial.col.kind')}
          value={kind}
          options={KINDS.map((k) => ({ value: k, label: t(`commercial.kind.${k}`) }))}
          onChange={(e) => {
            const k = e.currentTarget.value as Kind;
            setKind(k);
            setStatus(STATUSES[k][0] ?? 'received');
          }}
        />
        <SelectField
          id="commercial-status"
          label={t('commercial.col.status')}
          value={status}
          options={STATUSES[kind].map((s) => ({ value: s, label: t(`commercial.status.${s}`) }))}
          onChange={(e) => {
            setStatus(e.currentTarget.value as Status);
          }}
        />
        {kind === 'client_po' || kind === 'client_invoice' ? (
          <TextField
            id="commercial-reference"
            label={t('commercial.col.reference')}
            value={reference}
            onChange={(e) => {
              setReference(e.currentTarget.value);
            }}
          />
        ) : null}
        <TextField
          id="commercial-date"
          type="date"
          label={t('commercial.col.date')}
          value={date}
          onChange={(e) => {
            setDate(e.currentTarget.value);
          }}
        />
        {kind === 'dpia' ? null : (
          <>
            <TextField
              id="commercial-amount"
              label={t('commercial.amount')}
              hint={t('commercial.amountHint')}
              value={amount}
              onChange={(e) => {
                setAmount(e.currentTarget.value);
              }}
            />
            <TextField
              id="commercial-currency"
              label={t('commercial.currency')}
              maxLength={3}
              value={currency}
              onChange={(e) => {
                setCurrency(e.currentTarget.value);
              }}
            />
            {currency.trim().toUpperCase() === 'EUR' ? null : (
              <TextField
                id="commercial-rate"
                label={t('commercial.rate')}
                hint={t('commercial.rateHint')}
                value={rate}
                onChange={(e) => {
                  setRate(e.currentTarget.value);
                }}
              />
            )}
          </>
        )}
        <div>
          <Button type="submit">{t('commercial.save')}</Button>
        </div>
      </Form>
      {outcome ? (
        <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
          {t(`commercial.outcome.${outcome}`)}
        </FormMessage>
      ) : null}
    </>
  );
}
