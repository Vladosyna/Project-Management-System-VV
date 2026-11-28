// files permissions — one entry per command and query, with the roles that hold it.
// `pnpm gen:matrix` renders them into docs/ocs/permission-matrix.md.
import { permission } from '../kernel/index.ts';

export const filesPermissions = {
  storeFile: permission('files.file.store', {
    description:
      'Record a file stored in EU object storage for a project record (proposal, PO, invoice, quotation, drawing, Market Input), with hash, size, type and SOP-DEL-02 folder (D-46). A new version archives the previous one. From a person it is confirmed at once; from an AI agent it waits for a person.',
    roles: ['director', 'pm', 'finance', 'sales'],
  }),
  confirmFile: permission('files.file.confirm', {
    description:
      'Confirm a file an AI agent, the market link or a mail brought in (a person only, never an agent): only a confirmed file may go to DingTalk (D-46).',
    roles: ['director', 'pm', 'finance'],
  }),
  requestUpload: permission('files.upload.request', {
    description:
      'Put a confirmed file into its DingTalk project folder by SOP-DEL-02 ("Put in folder", D-46): the worker uploads it and records the DingTalk link. A person only.',
    roles: ['director', 'pm', 'finance'],
  }),
  // gen:permissions — `pnpm gen:command` and `pnpm gen:query` add entries above this line.
};
