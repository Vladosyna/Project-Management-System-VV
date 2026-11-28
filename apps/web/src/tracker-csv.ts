// E11 AC3: the programme tracker as CSV — what the Projects screen shows, one line per project and one column per
// gate (in the order the templates give them), so the hand-kept Excel tracker can be retired (D-19). UTF-8 with a
// BOM so Excel opens 中文 headers correctly; RFC 4180: every field quoted, quotes doubled.
import type { ProgrammeTrackerRow } from './api.ts';

/** U+FEFF, the UTF-8 byte order mark Excel needs to read the file as UTF-8. */
const BOM = String.fromCharCode(0xfeff);

/** Header and value words, already translated by the caller (keys listed in the Projects screen). */
export type TrackerLabel = (key: string) => string;

export function trackerCsv(
  rows: readonly ProgrammeTrackerRow[],
  opts: {
    label: TrackerLabel;
    /** Client PO and DPIA per site id, as shown; omitted when the role may not see commercial data. */
    commercial?: ReadonlyMap<string, { po: string; dpia: string }> | undefined;
  },
): string {
  const { label, commercial } = opts;
  const gates = new Map<string, string>();
  for (const r of rows) for (const g of r.gates) if (!gates.has(g.key)) gates.set(g.key, g.name);
  const head = [
    ...['projectId', 'site', 'country', 'city', 'standard', 'stage', 'planned', 'daysTo', 'readiness'].map(
      label,
    ),
    ...gates.values(),
    ...(commercial ? [label('po'), label('dpia')] : []),
  ];
  const lines = rows.map((r) => [
    r.projectId,
    r.name,
    r.countryCode,
    r.cityName,
    r.standard,
    r.stage ? label(`stage.${r.stage}`) : '',
    r.plannedInstallationDate ?? '',
    r.workingDaysToInstallation === null ? '' : String(r.workingDaysToInstallation),
    r.readinessAtRisk ? label('atRisk') : '',
    ...[...gates.keys()].map((key) => {
      const g = r.gates.find((x) => x.key === key);
      return g ? [label(`gate.${g.status}`), g.doneOn ?? ''].filter(Boolean).join(' ') : '';
    }),
    ...(commercial ? [commercial.get(r.siteId)?.po ?? '', commercial.get(r.siteId)?.dpia ?? ''] : []),
  ]);
  return `${BOM}${[head, ...lines].map((l) => l.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;
}
