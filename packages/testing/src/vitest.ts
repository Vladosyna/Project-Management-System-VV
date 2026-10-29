// Shared Vitest setup: `unit` runs *.test.ts, `integration` runs *.int.test.ts against PostgreSQL.
// Package scripts: test → --project unit, test:integration → --project integration.
import { fileURLToPath } from 'node:url';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

/** Values the integration globalSetup provides to tests via inject(). */
declare module 'vitest' {
  export interface ProvidedContext {
    postgresUrl: string;
  }
}

const globalSetup = fileURLToPath(new URL('./vitest-global-setup.ts', import.meta.url));

export function ocsVitestConfig(): ViteUserConfig {
  return defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            include: ['**/*.test.ts'],
            exclude: ['**/*.int.test.ts', '**/node_modules/**'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            include: ['**/*.int.test.ts'],
            exclude: ['**/node_modules/**'],
            globalSetup: [globalSetup],
            testTimeout: 60_000,
            hookTimeout: 180_000,
          },
        },
      ],
    },
  });
}
