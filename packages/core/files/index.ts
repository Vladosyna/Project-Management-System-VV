// files — Files attached in OCS: EU storage, confirmation, upload to the DingTalk project folder (D-46)
// Public API: other modules and apps may import only what this file exports (02-architecture §2).
export { filesPermissions } from './permissions.ts';
export { storeFile } from './commands/store-file.ts';
export { confirmFile } from './commands/confirm-file.ts';
export { requestUpload } from './commands/request-upload.ts';
