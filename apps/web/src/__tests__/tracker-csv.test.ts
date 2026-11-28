// E11 AC3: the programme tracker export — one line per project shown, a column per gate, readable in Excel
// (UTF-8 with BOM, RFC 4180 quoting). Anonymised data only.
import { describe, expect, it } from 'vitest';
import type { ProgrammeTrackerRow } from '../api.ts';
import { trackerCsv } from '../tracker-csv.ts';

const row = (over: Partial<ProgrammeTrackerRow>): ProgrammeTrackerRow => ({
  siteId: 's',
  projectId: 'CLIENTA-ES-MAD-001',
  name: 'Site 001',
  clientId: 'c',
  programmeId: null,
  countryCode: 'ES',
  cityName: 'Madrid',
  standard: 'L',
  stage: null,
  gates: [],
  plannedInstallationDate: null,
  workingDaysToInstallation: null,
  readinessAtRisk: false,
  ...over,
});

const label = (key: string) => `<${key}>`;
const lines = (csv: string) => csv.slice(1).split('\r\n');

describe('trackerCsv (E11 AC3)', () => {
  it('starts with a BOM so Excel reads 中文, then a header and one line per project', () => {
    const csv = trackerCsv([row({}), row({ projectId: 'CLIENTA-ES-MAD-002' })], { label });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines(csv)).toHaveLength(3);
    expect(lines(csv)[0]).toBe(
      '"<projectId>","<site>","<country>","<city>","<standard>","<stage>","<planned>","<daysTo>","<readiness>"',
    );
  });

  it('writes stage, dates and readiness, and one column per gate in template order', () => {
    const csv = trackerCsv(
      [
        row({
          stage: 'card_complete',
          plannedInstallationDate: '2026-12-09',
          workingDaysToInstallation: 2,
          readinessAtRisk: true,
          gates: [
            { key: 'g1', name: 'Gate 1', status: 'passed', doneOn: '2026-11-26' },
            { key: 'g2', name: 'Gate 2', status: 'current', doneOn: null },
          ],
        }),
        row({
          projectId: 'CLIENTB-PT-LIS-001',
          gates: [{ key: 'g9', name: 'Gate "9"', status: 'not_started', doneOn: null }],
        }),
      ],
      { label },
    );
    const [head, first, second] = lines(csv);
    expect(head).toContain('"Gate 1","Gate 2","Gate ""9"""');
    expect(first).toBe(
      '"CLIENTA-ES-MAD-001","Site 001","ES","Madrid","L","<stage.card_complete>","2026-12-09","2","<atRisk>",' +
        '"<gate.passed> 2026-11-26","<gate.current>",""',
    );
    expect(second).toContain('"","","<gate.not_started>"');
  });

  it('adds client PO and DPIA only when given', () => {
    const csv = trackerCsv([row({ siteId: 's1' })], {
      label,
      commercial: new Map([['s1', { po: '1 · 100.00 EUR', dpia: 'Approved' }]]),
    });
    expect(lines(csv)[0]).toMatch(/"<po>","<dpia>"$/);
    expect(lines(csv)[1]).toMatch(/"1 · 100.00 EUR","Approved"$/);
  });
});
