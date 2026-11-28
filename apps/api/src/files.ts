// D-46 (1): receiving an attached file over HTTP. The bytes go to EU object storage under a key OCS makes; the record
// (owner, SOP-DEL-02 folder, SHA-256, size, type) goes through files.file.store, the one write path. If the command
// refuses the file, the stored object is discarded.
import { createHash, randomUUID } from 'node:crypto';
import type { Actor } from '@ocs/contracts';
import { storeFile } from '@ocs/core/files';
import type { Runtime } from '@ocs/core/runtime';
import type { ObjectStore } from './object-store.ts';

/** The multipart fields besides the file itself; everything else is checked by the command. */
const FIELDS = ['ownerType', 'ownerId', 'sopFolder', 'arrivedVia', 'sourceRef', 'supersedesId'] as const;

export async function receiveFile(
  rt: Pick<Runtime, 'kernel'>,
  store: ObjectStore,
  actor: Actor,
  siteId: string,
  form: FormData,
) {
  const file = form.get('file');
  if (!(file instanceof File))
    return { status: 400 as const, body: { error: 'a file is required (field "file")' } };
  const data = new Uint8Array(await file.arrayBuffer());
  const objectKey = `sites/${siteId.toLowerCase()}/${randomUUID()}`;
  const fields = Object.fromEntries(
    FIELDS.flatMap((k) => {
      const v = form.get(k);
      return typeof v === 'string' && v !== '' ? [[k, v]] : [];
    }),
  );
  const input = {
    ...fields,
    siteId,
    objectKey,
    sha256: createHash('sha256').update(data).digest('hex'),
    sizeBytes: data.byteLength,
    mimeType: file.type || 'application/octet-stream',
    originalName: file.name,
  };
  await store.put(objectKey, data);
  try {
    return { status: 201 as const, body: await rt.kernel.execute(storeFile, actor, input, 'web') };
  } catch (e) {
    await store.discard(objectKey);
    throw e;
  }
}
