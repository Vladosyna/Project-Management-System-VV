// Generator plans and how they are applied. That the output passes verify is proven by `pnpm gen:selftest`.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { commandPlan, modulePlan, queryPlan, rulePlan } from '../core.ts';
import { applyPlan } from '../plan.ts';

let root: string;
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'ocs-gen-'));
  mkdirSync(path.join(root, 'packages/core/permissions'), { recursive: true });
  writeFileSync(path.join(root, 'packages/core/permissions/all.ts'), "import '../calendar/index.ts';\n");
});

describe('gen:module', () => {
  it('creates the public index and permissions, and registers the module', () => {
    applyPlan(root, modulePlan('intake', 'Handover Cards and intake review'));
    expect(read('packages/core/intake/index.ts')).toContain(
      "export { intakePermissions } from './permissions.ts';",
    );
    expect(read('packages/core/intake/permissions.ts')).toContain('// gen:permissions');
    expect(read('packages/core/permissions/all.ts')).toBe(
      "import '../calendar/index.ts';\nimport '../intake/index.ts';\n",
    );
  });

  it('refuses reserved and malformed names, and never overwrites', () => {
    expect(() => modulePlan('kernel', 'x')).toThrow(/reserved/);
    expect(() => modulePlan('Intake2', 'x')).toThrow(/lowercase/);
    expect(() => modulePlan('intake', ' ')).toThrow(/purpose/);
    applyPlan(root, modulePlan('intake', 'x'));
    expect(() => applyPlan(root, modulePlan('intake', 'x'))).toThrow(/already exists/);
    expect(read('packages/core/permissions/all.ts').match(/intake/g)).toHaveLength(1);
  });
});

describe('gen:command and gen:query', () => {
  beforeEach(() => {
    applyPlan(root, modulePlan('cases', 'Cases'));
  });

  it('derives the permission key <module>.<object>.<action> and adds a reserved permission', () => {
    applyPlan(root, commandPlan('cases', 'set-work-eta'));
    const permissions = read('packages/core/cases/permissions.ts');
    expect(permissions).toContain("import { permission } from '../kernel/index.ts';");
    expect(permissions).toContain("setWorkEta: permission('cases.workEta.set', {");
    expect(permissions).toContain('roles: [],');
    expect(read('packages/core/cases/index.ts')).toContain(
      "export { setWorkEta } from './commands/set-work-eta.ts';",
    );
    expect(read('packages/core/cases/commands/set-work-eta.ts')).toContain('defineCommand({');
    expect(read('packages/core/cases/__tests__/set-work-eta.int.test.ts')).toContain(
      'toBeInstanceOf(Forbidden)',
    );
  });

  it('adds the import once and keeps entries in order', () => {
    applyPlan(
      root,
      commandPlan('cases', 'close-case', { roles: ['pm', 'director'], description: "Close a client's case" }),
    );
    applyPlan(root, queryPlan('cases', 'case-list'));
    const permissions = read('packages/core/cases/permissions.ts');
    expect(permissions.match(/import \{ permission \}/g)).toHaveLength(1);
    expect(permissions.indexOf('closeCase')).toBeLessThan(permissions.indexOf('caseList'));
    expect(permissions).toContain("description: 'Close a client\\'s case',");
    expect(permissions).toContain("roles: ['pm', 'director'],");
    expect(permissions).toContain("permission('cases.caseList.read', {");
  });

  it('refuses a single-word command, a foreign key and a missing module', () => {
    expect(() => commandPlan('cases', 'close')).toThrow(/verb-noun/);
    expect(() => commandPlan('cases', 'close-case', { key: 'intake.case.close' })).toThrow(/cases\.<object>/);
    expect(() => applyPlan(root, commandPlan('nomodule', 'close-case'))).toThrow(/does not exist/);
  });
});

describe('gen:rule', () => {
  it('creates config citing the clause, evaluator and examples', () => {
    applyPlan(root, rulePlan('intake', 'blocking-items', 'SOP-DEL-01 §8', '1.3'));
    const config = read('packages/core/intake/rules/blocking-items.config.ts');
    expect(config).toContain("cite: 'SOP-DEL-01 §8',");
    expect(config).toContain("sopVersion: '1.3',");
    expect(read('packages/core/intake/rules/blocking-items.ts')).toContain(
      'export function checkBlockingItems(',
    );
    expect(read('packages/core/intake/rules/__tests__/blocking-items.examples.test.ts')).toContain(
      "decision: 'blocked'",
    );
  });

  it('refuses a rule without a clause or version', () => {
    expect(() => rulePlan('intake', 'blocking-items', 'SOP-DEL-01', '1.3')).toThrow(/clause/);
    expect(() => rulePlan('intake', 'blocking-items', 'SOP-DEL-01 §8', 'v1')).toThrow(/sop-version/);
  });
});
