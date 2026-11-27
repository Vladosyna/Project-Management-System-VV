// D-38: generators start pnpm through the shell on Windows (pnpm.cmd), directly elsewhere.
import { describe, expect, it } from 'vitest';
import { pnpmInvocation } from '../pnpm.ts';

describe('pnpmInvocation', () => {
  it('runs pnpm directly on Linux and macOS', () => {
    expect(pnpmInvocation(['gen:matrix'], 'linux')).toEqual({
      file: 'pnpm',
      args: ['gen:matrix'],
      shell: false,
    });
    expect(pnpmInvocation(['verify'], 'darwin').shell).toBe(false);
  });

  it('goes through the shell on Windows and quotes arguments that need it', () => {
    expect(pnpmInvocation(['exec', 'prettier', '--write', 'apps/web/src/pages/a b.tsx'], 'win32')).toEqual({
      file: 'pnpm',
      args: ['exec', 'prettier', '--write', '"apps/web/src/pages/a b.tsx"'],
      shell: true,
    });
  });
});
