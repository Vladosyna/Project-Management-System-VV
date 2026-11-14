// Network tab (Site mockup, "Switches with offline sensors"): the project's devices grouped by switch, offline
// first, with the port, IP and how long each has been down. Switch and port come from registration or import;
// devices without a switch are listed together.
import { useEffect, useState } from 'react';
import { FormMessage, StatusChip, useI18n } from '@ocs/ui';
import { loadSiteDevices, type SiteDevice } from '../api.ts';

const DAY = 86_400_000;

export function SiteNetwork(props: { siteId: string; now?: Date }) {
  const { t } = useI18n();
  const [devices, setDevices] = useState<SiteDevice[] | 'forbidden' | 'failed' | null>(null);
  useEffect(() => {
    loadSiteDevices(props.siteId).then(
      (list) => {
        setDevices(list ?? 'forbidden');
      },
      () => {
        setDevices('failed');
      },
    );
  }, [props.siteId]);

  if (devices === null) return <p>{t('common.loading')}</p>;
  if (devices === 'forbidden') return <p>{t('site.tile.noAccess')}</p>;
  if (devices === 'failed') return <FormMessage tone="error">{t('devices.listFailed')}</FormMessage>;
  if (devices.length === 0) return <p>{t('devices.none')}</p>;
  const now = (props.now ?? new Date()).getTime();
  const bySwitch = new Map<string, SiteDevice[]>();
  for (const d of devices) {
    const key = d.switchName ?? '';
    bySwitch.set(key, [...(bySwitch.get(key) ?? []), d]);
  }
  const offlineOf = (list: SiteDevice[]) => list.filter((d) => d.platformStatus === 'offline').length;
  const groups = [...bySwitch.entries()].sort(
    ([a, la], [b, lb]) =>
      offlineOf(lb) - offlineOf(la) || (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)),
  );
  return (
    <div className="ocs-stack">
      {groups.map(([name, list]) => (
        <section key={name || 'none'} aria-label={name || t('network.noSwitch')}>
          <h3>
            {name || t('network.noSwitch')} ·{' '}
            {t('network.summary', { total: String(list.length), offline: String(offlineOf(list)) })}
          </h3>
          <table className="ocs-table">
            <thead>
              <tr>
                <th scope="col">{t('network.col.port')}</th>
                <th scope="col">{t('devices.col.sn')}</th>
                <th scope="col">{t('network.col.ip')}</th>
                <th scope="col">{t('devices.col.platform')}</th>
                <th scope="col">{t('devices.col.offlineSince')}</th>
              </tr>
            </thead>
            <tbody>
              {[...list]
                .sort((a, b) =>
                  (a.switchPort ?? '').localeCompare(b.switchPort ?? '', undefined, { numeric: true }),
                )
                .map((d) => (
                  <tr key={d.id}>
                    <td>{d.switchPort ?? ''}</td>
                    <td>{d.sn}</td>
                    <td>{d.ip ?? ''}</td>
                    <td>
                      {t(`devices.platform.${d.platformStatus ?? 'unknown'}`)}
                      {d.offlineSince !== null && now - Date.parse(d.offlineSince) > DAY ? (
                        <>
                          {' '}
                          <StatusChip tone="escalated" />
                        </>
                      ) : null}
                    </td>
                    <td>{d.offlineSince ? d.offlineSince.slice(0, 16).replace('T', ' ') : ''}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
