// Site overview (Vlad, 13 Nov: "short information on the project, with a way to go deeper on every topic"):
// one tile per topic with its key numbers, each a link to its tab. Also the open actions of the project.
import { Link } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StatusChip, useI18n } from '@ocs/ui';
import {
  loadSiteActions,
  loadSiteDevices,
  type FeedItem,
  type OpenAction,
  type SiteDevice,
  type SiteSummary,
} from '../api.ts';

export const SITE_TABS = ['overview', 'devices', 'actions', 'timeline', 'settings'] as const;
export type SiteTab = (typeof SITE_TABS)[number];

const DAY = 86_400_000;

function Tile(props: { siteId: string; tab: SiteTab; label: string; value: string; note: ReactNode }) {
  return (
    <Link to="/sites/$siteId/$tab" params={{ siteId: props.siteId, tab: props.tab }} className="ocs-tile">
      <div className="ocs-tile__label">{props.label}</div>
      <div className="ocs-tile__value">{props.value}</div>
      <div className="ocs-tile__note">{props.note}</div>
    </Link>
  );
}

export function SiteOverview(props: { site: SiteSummary; feed: FeedItem[]; now?: Date }) {
  const { t } = useI18n();
  const [devices, setDevices] = useState<SiteDevice[] | undefined>(undefined);
  const [actions, setActions] = useState<OpenAction[]>([]);
  useEffect(() => {
    loadSiteDevices(props.site.id).then(setDevices, () => {
      setDevices(undefined);
    });
    loadSiteActions(props.site.id).then(setActions, () => {
      setActions([]);
    });
  }, [props.site.id]);

  const now = (props.now ?? new Date()).getTime();
  const offline = devices?.filter((d) => d.platformStatus === 'offline') ?? [];
  const overDay = offline.filter((d) => d.offlineSince !== null && now - Date.parse(d.offlineSince) > DAY);
  const visit = props.feed.find((f) => f.kind === 'visit');
  const coverage = typeof visit?.detail.coverage === 'string' ? visit.detail.coverage : null;
  const id = props.site.id;
  return (
    <div className="ocs-tiles">
      <Tile
        siteId={id}
        tab="devices"
        label={t('site.tile.devices')}
        value={devices ? String(devices.length) : '—'}
        note={
          devices ? (
            <>
              {t('site.tile.devicesNote', { offline: String(offline.length) })}
              {overDay.length > 0 ? (
                <>
                  {' '}
                  · {t('site.tile.overDay', { count: String(overDay.length) })}{' '}
                  <StatusChip tone="escalated" />
                </>
              ) : null}
            </>
          ) : (
            t('site.tile.noAccess')
          )
        }
      />
      <Tile
        siteId={id}
        tab="actions"
        label={t('site.tile.actions')}
        value={String(actions.length)}
        note={t('site.tile.actionsNote', { overdue: String(actions.filter((a) => a.overdue).length) })}
      />
      <Tile
        siteId={id}
        tab="timeline"
        label={t('site.tile.lastVisit')}
        value={visit ? visit.at.slice(0, 10) : '—'}
        note={coverage ? t('site.coverage', { coverage }) : t('site.tile.noVisit')}
      />
      <Tile
        siteId={id}
        tab="settings"
        label={t('site.tile.alerts')}
        value={props.site.deviceAlertsEnabled ? t('site.tile.on') : t('site.tile.off')}
        note={props.site.platformRef ? t('site.tile.linked') : t('site.tile.notLinked')}
      />
    </div>
  );
}

export function SiteActions(props: { siteId: string }) {
  const { t } = useI18n();
  const [actions, setActions] = useState<OpenAction[] | null>(null);
  useEffect(() => {
    loadSiteActions(props.siteId).then(setActions, () => {
      setActions([]);
    });
  }, [props.siteId]);
  if (actions === null) return <p>{t('common.loading')}</p>;
  if (actions.length === 0) return <p>{t('site.noActions')}</p>;
  return (
    <ul className="ocs-board__list">
      {actions.map((a) => (
        <li key={a.id} className="ocs-board__card">
          <div className="ocs-board__title">{a.title}</div>
          <div className="ocs-board__meta">
            {a.owner.name ?? ''} · {a.due} {a.overdue ? <StatusChip tone="escalated" /> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
