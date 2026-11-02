// /sites/$siteId — one project/site, from the Site mockup. Today: header and "Timeline & comments" (the
// project feed, E5 AC4, source on every item) with a comment box that can @mention staff (AC2).
// Devices & network arrive with E4, algorithms with E7.
import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CheckboxGroup,
  Form,
  FormMessage,
  PageHeader,
  StatusChip,
  TextArea,
  useI18n,
} from '@ocs/ui';
import {
  addComment,
  loadSite,
  loadStaff,
  type ClientSummary,
  type FeedItem,
  type SiteSummary,
  type StaffMember,
} from '../api.ts';

type State =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'missing' }
  | { kind: 'loaded'; site: SiteSummary; client: ClientSummary | undefined; feed: FeedItem[] };

const SOURCES = ['manual', 'mail', 'dingtalk', 'meeting', 'visit', 'alert', 'comment'] as const;
type SourceKind = (typeof SOURCES)[number];
const sourceKind = (kind: string): SourceKind =>
  (SOURCES as readonly string[]).includes(kind) ? (kind as SourceKind) : 'manual';

export function SitePage(props: { siteId: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [commentError, setCommentError] = useState<'failed' | 'forbidden' | null>(null);

  const reload = useCallback(() => {
    loadSite(props.siteId).then(
      (data) => {
        setState(data ? { kind: 'loaded', ...data } : { kind: 'missing' });
      },
      () => {
        setState({ kind: 'failed' });
      },
    );
  }, [props.siteId]);

  useEffect(() => {
    reload();
    loadStaff().then(setStaff, () => {
      setStaff([]);
    });
  }, [reload]);

  const submit = async () => {
    setCommentError(null);
    try {
      if ((await addComment(props.siteId, body, mentions)) === 'forbidden') {
        setCommentError('forbidden');
        return;
      }
      setBody('');
      setMentions([]);
      reload();
    } catch {
      setCommentError('failed');
    }
  };

  if (state.kind === 'loading') return <p>{t('common.loading')}</p>;
  if (state.kind === 'failed') return <FormMessage tone="error">{t('site.failed')}</FormMessage>;
  if (state.kind === 'missing') return <FormMessage tone="error">{t('site.missing')}</FormMessage>;

  const { site, client, feed } = state;
  return (
    <>
      <PageHeader
        eyebrow={`/ ${client?.name ?? ''} / ${site.cityName} · ${site.projectId}`}
        title={`${site.name} · ${t('site.standard', { standard: site.standard })}`}
      />
      <div className="ocs-stack">
        <Card title={t('site.devices')} titleId="site-devices">
          <p>{t('site.devicesSoon')}</p>
        </Card>
        <Card title={t('site.timeline')} titleId="site-timeline">
          <Form onSubmit={submit}>
            <TextArea
              id="comment-body"
              label={t('site.comment')}
              value={body}
              required
              onChange={(e) => {
                setBody(e.currentTarget.value);
              }}
            />
            {staff.length > 0 ? (
              <CheckboxGroup
                legend={t('site.mention')}
                options={staff.map((s) => ({ id: s.id, label: s.name }))}
                value={mentions}
                onChange={setMentions}
              />
            ) : null}
            {commentError ? (
              <FormMessage tone="error">
                {t(commentError === 'forbidden' ? 'site.commentForbidden' : 'site.commentFailed')}
              </FormMessage>
            ) : null}
            <div>
              <Button type="submit" disabled={body.trim() === ''}>
                {t('site.addComment')}
              </Button>
            </div>
          </Form>
          {feed.length === 0 ? <p>{t('site.timelineEmpty')}</p> : null}
          <ul className="ocs-board__list">
            {feed.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="ocs-board__card">
                <div className="ocs-board__meta">
                  {item.at.slice(0, 10)} · {t(`site.kind.${item.kind}`)}{' '}
                  {item.detail.escalate === true ? <StatusChip tone="escalated" /> : null}
                </div>
                <div className="ocs-board__title">{item.text}</div>
                <div className="ocs-board__meta">
                  {t('actions.source', {
                    source: t(`source.${sourceKind(item.source.kind)}`),
                    ref: item.source.ref ? ` · ${item.source.ref}` : '',
                  })}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
