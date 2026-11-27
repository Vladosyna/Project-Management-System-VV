// Runs pnpm the same way on Linux, macOS and Windows (D-38). On Windows `pnpm` is a `pnpm.cmd` shim: execFileSync
// cannot start it without a shell (ENOENT, and Node refuses .cmd files without `shell` since CVE-2024-27980). There
// the command goes through the shell, with every argument quoted; elsewhere it runs directly, as before.
import { execFileSync } from 'node:child_process';

/** Quotes one argument for cmd.exe; the arguments here are script names and repository paths. */
const quoteForCmd = (arg: string) => (/^[\w@./:=-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '""')}"`);

export function pnpmInvocation(args: readonly string[], platform: NodeJS.Platform = process.platform) {
  return platform === 'win32'
    ? { file: 'pnpm', args: args.map(quoteForCmd), shell: true }
    : { file: 'pnpm', args: [...args], shell: false };
}

export function runPnpm(args: readonly string[], cwd: string): void {
  const call = pnpmInvocation(args);
  execFileSync(call.file, call.args, { cwd, stdio: 'inherit', shell: call.shell });
}
