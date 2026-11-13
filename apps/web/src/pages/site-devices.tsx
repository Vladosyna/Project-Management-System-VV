// The Devices list of a project (Site mockup, "Sensors"): platform status, offline since, whether it was
// registered in OCS by SN, and the gate each channel counts. Offline first; R15 is offline over 24 h.
import { useEffect, useState } from 'react';
import { FormMessage, StatusChip, useI18n } from '@ocs/ui';
import { loadSiteDevices, type SiteDevice } from '../api.ts';

const DAY = 86_400_000;
const rank = (d: SiteDevice) => (d.platformStatus === 'offline' ? 0 : d.platformStatus === null ? 1 : 2);

export function SiteDevices(props: { siteId: string; now?: Date }) {
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
  if (devices === 'forbidden') return null;
  if (devices === 'failed') return <FormMessage tone="error">{t('devices.listFailed')}</FormMessage>;
  if (devices.length === 0) return <p>{t('devices.none')}</p>;
  const now = (props.now ?? new Date()).getTime();
  const sorted = [...devices].sort((a, b) => rank(a) - rank(b) || a.sn.localeCompare(b.sn));
  return (
    <table className="ocs-table">
      <thead>
        <tr>
          <th scope="col">{t('devices.col.sn')}</th>
          <th scope="col">{t('devices.col.model')}</th>
          <th scope="col">{t('devices.col.platform')}</th>
          <th scope="col">{t('devices.col.offlineSince')}</th>
          <th scope="col">{t('devices.col.gates')}</th>
          <th scope="col">{t('devices.col.registered')}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((d) => {
          const overDay = d.offlineSince !== null && now - Date.parse(d.offlineSince) > DAY;
          return (
            <tr key={d.id}>
              <td>{d.sn}</td>
              <td>{d.model}</td>
              <td>
                {t(`devices.platform.${d.platformStatus ?? 'unknown'}`)}
                {overDay ? (
                  <>
                    {' '}
                    <StatusChip tone="escalated" />
                  </>
                ) : null}
              </td>
              <td>{d.offlineSince ? d.offlineSince.slice(0, 16).replace('T', ' ') : ''}</td>
              <td>
                {d.channels.map((c) => `${String(c.no)}: ${c.gate ?? t('devices.unbound')}`).join(' · ')}
              </td>
              <td>{d.registered ? t('devices.yes') : t('devices.platformOnly')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
