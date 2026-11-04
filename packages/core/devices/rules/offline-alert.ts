// R15 (domain/rules.md §15) — evaluator. Reads only ./offline-alert.config.ts. Decides; never throws.
import { offlineAlertRule } from './offline-alert.config.ts';

export interface OfflineAlertInput {
  /** What the device platform last said (null: never synced). */
  readonly platformStatus: 'online' | 'offline' | 'disabled' | null;
  readonly offlineSince: Date | null;
  readonly alertsEnabled: boolean;
}

/** Devices offline since before this moment are due (used by the query to narrow the rows). */
export function offlineAlertCutoff(now: Date): Date {
  return new Date(now.getTime() - offlineAlertRule.offlineHours * 3_600_000);
}

export function isOfflineAlertDue(input: OfflineAlertInput, now: Date): boolean {
  if (offlineAlertRule.onlyWhenAlertsEnabled && !input.alertsEnabled) return false;
  if (input.platformStatus !== 'offline' || input.offlineSince === null) return false;
  return input.offlineSince < offlineAlertCutoff(now);
}
