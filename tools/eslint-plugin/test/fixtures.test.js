// @ts-check
// F0.3 acceptance: every OCS lint rule is proven by a deliberate violation (fixtures/bad) that fails
// with exactly the expected rules, and by good fixtures that pass. Fixtures are linted as if they
// lived at the path in their `// path:` header, with the same `ocsRules` layer the repo lint uses.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { ocsRules } from '../../../eslint.config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: ocsRules });

/** @param {'bad' | 'good'} kind */
function load(kind) {
  const dir = path.join(here, '../fixtures', kind);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.fixture'))
    .map((f) => {
      const code = readFileSync(path.join(dir, f), 'utf8');
      const filePath = /^\/\/ path: (.+)$/m.exec(code)?.[1]?.trim();
      const expectLine = /^\/\/ expect: (.+)$/m.exec(code)?.[1]?.trim();
      if (!filePath || !expectLine) throw new Error(`${f}: missing "// path:" or "// expect:" header`);
      const expected = expectLine === 'none' ? [] : expectLine.split(',').map((s) => s.trim());
      return { name: f.replace(/\.fixture$/, ''), code, filePath, expected };
    });
}

/** @param {string} code @param {string} filePath */
async function ruleIds(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  const messages = result?.messages ?? [];
  const fatal = messages.find((m) => m.fatal);
  if (fatal) throw new Error(`parse error: ${fatal.message}`);
  return [...new Set(messages.map((m) => m.ruleId ?? 'unknown'))].sort();
}

describe('deliberate violations fail lint', () => {
  for (const f of load('bad')) {
    it(`${f.name} → ${f.expected.join(', ')}`, async () => {
      expect(await ruleIds(f.code, f.filePath)).toEqual([...f.expected].sort());
    });
  }
});

describe('allowed code passes lint', () => {
  for (const f of load('good')) {
    it(f.name, async () => {
      expect(await ruleIds(f.code, f.filePath)).toEqual([]);
    });
  }
});
