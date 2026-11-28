// File policy (03-engineering-rules §7, D-46): what OCS accepts as an attached file. Read only by store-file.
export const filePolicy = {
  cite: '03 §7, D-46',
  /** Documents, sheets, drawings and photos the delivery work uses. */
  mimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/heic',
    'application/acad',
    'image/vnd.dwg',
    'application/zip',
  ],
  /** 100 MB. Assumption: enough for floor plans and photo sets; larger ones as a zip of parts. */
  maxBytes: 100 * 1024 * 1024,
} as const;
