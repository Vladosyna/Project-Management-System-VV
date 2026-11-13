// When a device went offline, from what the platform says now and what OCS recorded before. The platform has
// no last-seen field (07-integrations), so offline_since is the first sync that saw it offline.
import type { DEVICE_PLATFORM_STATUSES } from '../repository.ts';

export type PlatformStatus = (typeof DEVICE_PLATFORM_STATUSES)[number];

export interface OfflineChange {
  readonly offlineSince: Date | null;
  /** went_offline: newly offline (also a new device first seen offline); offline_ended: it was offline and is now online or disabled. */
  readonly event: 'went_offline' | 'offline_ended' | null;
}

export function offlineChange(
  now: Date,
  next: PlatformStatus,
  before: { status: PlatformStatus | null; offlineSince: Date | null } | null,
): OfflineChange {
  const wasOffline = before?.status === 'offline';
  if (next === 'offline') {
    return wasOffline
      ? { offlineSince: before.offlineSince ?? now, event: null }
      : { offlineSince: now, event: 'went_offline' };
  }
  return { offlineSince: null, event: wasOffline ? 'offline_ended' : null };
}
