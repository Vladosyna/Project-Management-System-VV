// R15 (domain/rules.md §15) — "Sensor offline after go-live: offline > 24 h (device platform)" (P1). What counts
// is set here; the evaluator reads only this config. A new version of the rule updates this file.
export const offlineAlertRule = {
  cite: 'R15 (domain/rules.md §15)',
  sopVersion: '1.0',
  /** Offline longer than this, counted from offline_since (the first sync that saw it offline). */
  offlineHours: 24,
  /**
   * "After go-live" is the project's alerts checkbox (site.device_alerts_enabled, Vlad 3 Nov 2026): a mall that
   * is not live yet, where everything is still offline, raises nothing until someone ticks it.
   */
  onlyWhenAlertsEnabled: true as boolean,
} as const;
