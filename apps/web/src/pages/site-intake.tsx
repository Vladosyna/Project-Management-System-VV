// Intake tab (E2, SOP-DEL-01 §5 steps 2–3, §6): Sales fills the Handover Card — project type, the §3 questions and
// every §6 item (provided, or N/A with a reason) — saves the draft, sees what is still missing and submits. Group F
// items are only marked as recorded in the restricted notes; their text never goes on the card (AC7). The rules
// live in core; this screen only shows what the API says.
import { useEffect, useState } from 'react';
import { Button, CheckboxGroup, Form, FormMessage, SelectField, TextField, useI18n } from '@ocs/ui';
import { intakeWrite, loadHandoverCard, type HandoverCardView } from '../api.ts';
import { IntakeDecision } from './intake-decision.tsx';

const CODES = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'A7',
  'A8',
  'B1',
  'B2',
  'B3',
  'B4',
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'D1',
  'D2',
  'D3',
  'E1',
  'E2',
  'E3',
  'E4',
  'E5',
  'E6',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'G1',
] as const;
type Code = (typeof CODES)[number];
const TYPES = ['new', 'poc', 'poc_to_rollout', 'expansion', 'add_points', 'supply_only'] as const;
interface Row {
  state: 'none' | 'provided' | 'na';
  text: string;
}
type ItemInput =
  { code: string; status: 'provided'; value?: string } | { code: string; status: 'na'; naReason: string };
type Outcome = 'ok' | 'forbidden' | 'invalid' | 'rule' | 'conflict' | 'failed';

const rowsOf = (card: HandoverCardView | null): Record<string, Row> =>
  Object.fromEntries(
    CODES.map((code) => {
      const it = card?.items.find((i) => i.code === code);
      return [
        code,
        it
          ? { state: it.status, text: (it.status === 'na' ? it.naReason : it.value) ?? '' }
          : { state: 'none', text: '' },
      ];
    }),
  );

export function SiteIntake(props: { siteId: string }) {
  const { t } = useI18n();
  const [card, setCard] = useState<HandoverCardView | null | 'forbidden' | 'failed' | 'loading'>('loading');
  const [version, setVersion] = useState(0);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [flags, setFlags] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>(rowsOf(null));
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    loadHandoverCard(props.siteId).then(
      (c) => {
        setCard(c === undefined ? 'forbidden' : c);
        if (c) {
          setName(c.content.identification?.projectName ?? '');
          setType(c.content.identification?.projectType ?? '');
          setRows(rowsOf(c));
        }
      },
      () => {
        setCard('failed');
      },
    );
  }, [props.siteId, version]);

  if (card === 'loading') return <p>{t('common.loading')}</p>;
  if (card === 'forbidden') return <p>{t('intake.noAccess')}</p>;
  if (card === 'failed') return <FormMessage tone="error">{t('intake.failed')}</FormMessage>;
  const editable = card === null || card.status === 'draft' || card.status === 'returned';
  const run = async (path: 'handover-card' | 'handover-card/submit', body: Record<string, unknown>) => {
    setOutcome(null);
    try {
      const r = await intakeWrite(props.siteId, path, body);
      setOutcome(r);
      if (r === 'ok') setVersion((v) => v + 1);
    } catch {
      setOutcome('failed');
    }
  };
  const save = () =>
    run('handover-card', {
      content: {
        identification: {
          ...(name.trim() ? { projectName: name.trim() } : {}),
          ...(type ? { projectType: type } : {}),
        },
      },
      items: CODES.flatMap((code: Code): ItemInput[] => {
        const r = rows[code];
        if (!r || r.state === 'none') return [];
        if (r.state === 'na') return [{ code, status: 'na', naReason: r.text }];
        return [
          {
            code,
            status: 'provided',
            ...(code.startsWith('F') || !r.text.trim() ? {} : { value: r.text.trim() }),
          },
        ];
      }),
      installsOrConfigures: flags.includes('installs'),
      newClientOrPlace: flags.includes('newPlace'),
    });

  return (
    <div className="ocs-stack">
      {card ? (
        <p>
          {t('intake.status')}: {t(`intake.status.${card.status}`)} · {t('intake.version')} {card.version} ·{' '}
          {t('intake.package')}: {card.package === 'full' ? 'Full' : 'Light'}
        </p>
      ) : (
        <p>{t('intake.none')}</p>
      )}
      {card && editable ? (
        <p>
          {card.gaps.length > 0
            ? t('intake.gaps', { codes: card.gaps.map((g) => g.code).join(', ') })
            : t('intake.ready')}
        </p>
      ) : null}
      {editable ? (
        <Form onSubmit={save}>
          <TextField
            id="intake-name"
            label={t('intake.projectName')}
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
            }}
          />
          <SelectField
            id="intake-type"
            label={t('intake.projectType')}
            value={type}
            options={[
              { value: '', label: '—' },
              ...TYPES.map((x) => ({ value: x, label: t(`intake.type.${x}`) })),
            ]}
            onChange={(e) => {
              setType(e.currentTarget.value);
            }}
          />
          <CheckboxGroup
            legend={t('intake.package')}
            options={[
              { id: 'installs', label: t('intake.installs') },
              { id: 'newPlace', label: t('intake.newPlace') },
            ]}
            value={flags}
            onChange={setFlags}
          />
          <table className="ocs-table">
            <thead>
              <tr>
                <th scope="col">{t('intake.col.item')}</th>
                <th scope="col">{t('intake.col.state')}</th>
                <th scope="col">{t('intake.col.detail')}</th>
              </tr>
            </thead>
            <tbody>
              {CODES.map((code) => {
                const r = rows[code] ?? { state: 'none', text: '' };
                const set = (patch: Partial<Row>) => {
                  setRows((rs) => ({ ...rs, [code]: { ...r, ...patch } }));
                };
                const label = `${code} ${t(`intake.item.${code}`)}`;
                const restricted = code.startsWith('F') && r.state === 'provided';
                return (
                  <tr key={code}>
                    <th scope="row">{label}</th>
                    <td>
                      <SelectField
                        id={`intake-${code}-state`}
                        label={`${t('intake.col.state')} ${code}`}
                        value={r.state}
                        options={(['none', 'provided', 'na'] as const).map((s) => ({
                          value: s,
                          label: t(`intake.state.${s}`),
                        }))}
                        onChange={(e) => {
                          set({ state: e.currentTarget.value as Row['state'] });
                        }}
                      />
                    </td>
                    <td>
                      {restricted ? (
                        t('intake.restricted')
                      ) : (
                        <TextField
                          id={`intake-${code}-text`}
                          label={`${t('intake.col.detail')} ${code}`}
                          value={r.text}
                          disabled={r.state === 'none'}
                          onChange={(e) => {
                            set({ text: e.currentTarget.value });
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div>
            <Button type="submit">{t('intake.save')}</Button>{' '}
            {card?.status === 'draft' ? (
              <Button type="button" onClick={() => void run('handover-card/submit', {})}>
                {t('intake.submit')}
              </Button>
            ) : null}
          </div>
          {outcome ? (
            <FormMessage tone={outcome === 'ok' ? 'ok' : 'error'}>
              {t(`intake.outcome.${outcome}`)}
            </FormMessage>
          ) : null}
        </Form>
      ) : null}
      {card ? (
        <IntakeDecision
          siteId={props.siteId}
          card={card}
          codes={CODES}
          onDone={() => {
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </div>
  );
}
