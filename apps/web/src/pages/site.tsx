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
import { sourceLabel } from '../source.ts';
import { CommentToAction } from './comment-to-action.tsx';
import { DeviceAlerts } from './device-alerts.tsx';
import { SiteDevices } from './site-devices.tsx';
import { SiteNetwork } from './site-network.tsx';
import { SITE_TABS, SiteActions, SiteOverview, type SiteTab } from './site-overview.tsx';
import { Link } from '@tanstack/react-router';
import { VisitForm } from './visit-form.tsx';

type State =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'missing' }
  | { kind: 'loaded'; site: SiteSummary; client: ClientSummary | undefined; feed: FeedItem[] };

export function SitePage(props: { siteId: string; tab?: SiteTab }) {
  const tab = props.tab ?? 'overview';
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
      <nav className="ocs-tabs" aria-label={t('site.tabs')}>
        {SITE_TABS.map((key) => (
          <Link
            key={key}
            to={key === 'overview' ? '/sites/$siteId' : '/sites/$siteId/$tab'}
            params={key === 'overview' ? { siteId: props.siteId } : { siteId: props.siteId, tab: key }}
            aria-current={key === tab ? 'page' : undefined}
          >
            {t(`site.tab.${key}`)}
          </Link>
        ))}
      </nav>
      <div className="ocs-stack">
        {tab === 'overview' ? <SiteOverview site={site} feed={feed} /> : null}
        {tab === 'devices' ? (
          <Card title={t('site.devices')} titleId="site-devices">
            <SiteDevices siteId={props.siteId} />
          </Card>
        ) : null}
        {tab === 'network' ? (
          <Card title={t('site.tab.network')} titleId="site-network">
            <SiteNetwork siteId={props.siteId} />
          </Card>
        ) : null}
        {tab === 'actions' ? (
          <Card title={t('site.tab.actions')} titleId="site-actions">
            <SiteActions siteId={props.siteId} />
          </Card>
        ) : null}
        {tab === 'settings' ? (
          <Card title={t('site.tab.settings')} titleId="site-settings">
            <DeviceAlerts site={site} onDone={reload} />
          </Card>
        ) : null}
        {tab === 'timeline' ? (
          <Card title={t('site.timeline')} titleId="site-timeline">
            <VisitForm siteId={props.siteId} staff={staff} onDone={reload} />
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
                    {item.at.slice(0, 10)} · {t(`site.kind.${item.kind}`)}
                    {typeof item.detail.coverage === 'string'
                      ? ` · ${t('site.coverage', { coverage: item.detail.coverage })}`
                      : ''}{' '}
                    {item.detail.escalate === true ? <StatusChip tone="escalated" /> : null}
                  </div>
                  <div className="ocs-board__title">{item.text}</div>
                  <div className="ocs-board__meta">{sourceLabel(t, item.source)}</div>
                  {item.kind === 'comment' ? (
                    <CommentToAction commentId={item.id} staff={staff} onDone={reload} />
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
