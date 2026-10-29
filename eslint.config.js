// ESLint flat config (ADR-001 P-08). Protected file — changes go through an arch/ branch.
// `ocsRules` is the OCS guardrail layer; the fixtures in tools/eslint-plugin/fixtures prove each rule fires.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import boundaries from 'eslint-plugin-boundaries';
import ocs from '@ocs/eslint-plugin';

const SRC = '**/*.{ts,tsx,js,jsx,mjs}';
const CODE = [`apps/${SRC}`, `packages/${SRC}`, `tools/${SRC}`];

/**
 * Files allowed to delete rows of technical (non-business, audit-free) tables. Architect role only.
 * @type {string[]}
 */
const DELETE_ALLOWLIST = [
  'packages/db/src/migrate.ts', // migrations.applied bookkeeping on migrateDown
];

/** @param {string[]} types */
const to = (types) => [{ to: { element: { types: { anyOf: types } } } }];

/** Which kind of element may import which — 02-architecture §2. Every element may import itself. */
const DEPENDENCY_POLICIES = [
  {
    from: { element: { type: 'app', captured: { app: 'web' } } },
    allow: to(['app', 'contracts', 'ui', 'i18n']),
  },
  {
    from: { element: { type: 'app', captured: { app: '{api,worker,mcp}' } } },
    allow: to(['app', 'core-module', 'core-kernel', 'contracts']),
  },
  {
    from: { element: { type: 'core-module' } },
    allow: to(['core-module', 'core-kernel', 'contracts', 'db']),
  },
  { from: { element: { type: 'core-kernel' } }, allow: to(['core-kernel', 'contracts', 'db']) },
  { from: { element: { type: 'ui' } }, allow: to(['ui', 'i18n']) },
  {
    from: { element: { type: 'testing' } },
    allow: to(['testing', 'core-module', 'core-kernel', 'contracts', 'db', 'i18n']),
  },
  { from: { element: { type: 'contracts' } }, allow: to(['contracts']) },
  { from: { element: { type: 'db' } }, allow: to(['db']) },
  { from: { element: { type: 'i18n' } }, allow: to(['i18n']) },
  { from: { element: { type: 'tool' } }, allow: to(['tool']) },
];

/** Tests and vitest configs may additionally use the test infrastructure. */
const TEST_FILES = ['**/__tests__/**', '**/*.test.{ts,tsx,js}', '**/vitest.config.ts'];
const TEST_POLICIES = [...DEPENDENCY_POLICIES, { allow: to(['testing']) }];

/** @param {unknown[]} policies */
const dependencyRule = (policies) => ({
  default: 'disallow',
  message: 'This import breaks the module boundaries of 02-architecture §2 (see the table there).',
  policies,
});

/** OCS guardrail layer. Rules do not need type information, so fixtures can lint virtual files. */
/** @type {import('eslint').Linter.Config[]} */
export const ocsRules = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // 03-engineering-rules §3: no any, no ts-ignore, non-null `!` only with an explanation.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    // Module boundaries — 02-architecture §2.
    files: CODE,
    plugins: { boundaries, ocs },
    settings: {
      'boundaries/root-path': import.meta.dirname,
      'import/resolver': { typescript: { project: `${import.meta.dirname}/tsconfig.paths.json` } },
      'boundaries/elements': [
        { type: 'core-kernel', pattern: 'packages/core/kernel' },
        { type: 'core-module', pattern: 'packages/core/*', capture: ['module'] },
        { type: 'contracts', pattern: 'packages/contracts' },
        { type: 'db', pattern: 'packages/db' },
        { type: 'ui', pattern: 'packages/ui' },
        { type: 'i18n', pattern: 'packages/i18n' },
        { type: 'testing', pattern: 'packages/testing' },
        { type: 'app', pattern: 'apps/*', capture: ['app'] },
        { type: 'tool', pattern: 'tools/*', capture: ['tool'] },
      ],
    },
    rules: {
      // Which kind of element may depend on which (02-architecture §2). Entry points: ocs/public-api-only.
      'boundaries/dependencies': ['error', dependencyRule(DEPENDENCY_POLICIES)],
      'ocs/public-api-only': 'error',
    },
  },
  {
    files: TEST_FILES,
    rules: { 'boundaries/dependencies': ['error', dependencyRule(TEST_POLICIES)] },
  },
  {
    files: CODE,
    ignores: ['packages/ui/**', 'tools/eslint-plugin/**'],
    plugins: { ocs },
    rules: { 'ocs/no-raw-colour': 'error', 'ocs/no-inline-style': 'error' },
  },
  {
    files: ['apps/web/**/*.{tsx,jsx}', 'packages/ui/**/*.{tsx,jsx}'],
    plugins: { ocs },
    rules: { 'ocs/no-literal-string': 'error' },
  },
  {
    files: CODE,
    ignores: ['tools/eslint-plugin/**'],
    plugins: { ocs },
    rules: { 'ocs/no-dangerous-html': 'error' },
  },
  {
    files: [`apps/${SRC}`, `packages/${SRC}`],
    ignores: ['packages/db/migrations/**', ...TEST_FILES, ...DELETE_ALLOWLIST],
    plugins: { ocs },
    rules: { 'ocs/no-business-delete': 'error' },
  },
  {
    files: CODE,
    ignores: ['**/repository.ts', 'packages/db/**', 'packages/core/kernel/**', 'packages/testing/**'],
    plugins: { ocs },
    rules: { 'ocs/no-db-import': 'error' },
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      'docs/ocs/reference/**',
      '.claude/skills/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  ...ocsRules,
  prettier,
);
