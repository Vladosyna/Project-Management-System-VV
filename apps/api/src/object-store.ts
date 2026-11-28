// EU object storage for attached files (D-46 (1), 03 §7: never inline in the database). One small port; the local
// directory store serves development, tests and a single EU host. An S3-compatible store for the EU deployment
// follows with its dependency review. Keys are made by OCS, never taken from a request.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export interface ObjectStore {
  put(key: string, data: Uint8Array): Promise<void>;
  /** Removes an object written for a file that was then refused (no business record exists for it). */
  discard(key: string): Promise<void>;
}

const KEY = /^[a-z0-9][a-z0-9/-]{0,199}$/;

export function localObjectStore(root: string): ObjectStore {
  const base = resolve(root);
  const pathOf = (key: string) => {
    if (!KEY.test(key) || key.includes('..')) throw new Error('invalid object key');
    return join(base, key);
  };
  return {
    async put(key, data) {
      const path = pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data, { flag: 'wx' });
    },
    async discard(key) {
      await rm(pathOf(key), { force: true });
    },
  };
}
