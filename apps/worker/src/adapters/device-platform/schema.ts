// Response shapes of the VION Footfall 2.0 OpenAPI v2 (device platform, 07-integrations.md). Read only.
// Parsed with zod so a changed field fails loudly instead of syncing wrong data. Unknown fields pass through.
import { z } from 'zod';

/** Every response: { code, success, msg | message, data }. */
export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({
    code: z.number(),
    success: z.boolean(),
    msg: z.string().optional(),
    message: z.string().optional(),
    data,
  });

export const LoginData = z.object({ atoken: z.string().min(1) });

/** A mall (plazaInfo) or a store/area (areaInfo): both use plazaUnid as their id, in the endpoint's context. */
export const Plaza = z.object({
  plazaUnid: z.string().min(1),
  plazaExternalid: z.string().nullish(),
  plazaName: z.string(),
  groupName: z.string().nullish(),
  timeZone: z.string().nullish(),
  provinceName: z.string().nullish(),
  cityName: z.string().nullish(),
});
export type Plaza = z.infer<typeof Plaza>;

export const Gate = z.object({
  plazaUnid: z.string().min(1),
  gateUnid: z.string().min(1),
  /** 1 = mall entrance, 0 = store entrance. */
  isMallGate: z.number(),
  gateName: z.string(),
  gateExternalid: z.string().nullish(),
  /** 1 = enabled, 0 = disabled. */
  gateStatus: z.number(),
});
export type Gate = z.infer<typeof Gate>;

export const Device = z.object({
  /** The device's identity (D-29). */
  serialnum: z.string().min(1),
  name: z.string().nullish(),
  channelCount: z.number().nullish(),
  /** Last MAC reported; can change on restart (D-29). */
  mac: z.string().nullish(),
  /** 0 = offline, 1 = online, 3 = disabled. */
  status: z.number(),
  localIp: z.string().nullish(),
  /** Hardware type, e.g. the model. */
  hardware: z.string().nullish(),
  modifyTime: z.string().nullish(),
  bindTime: z.string().nullish(),
  channelList: z
    .array(
      z.object({
        channelNo: z.string(),
        serialnum: z.string().nullish(),
        site: z
          .object({ gateUnid: z.string(), gateName: z.string().nullish(), isMallGate: z.number().nullish() })
          .nullish(),
      }),
    )
    .nullish(),
});
export type Device = z.infer<typeof Device>;

export const platformStatus = { 0: 'offline', 1: 'online', 3: 'disabled' } as const;
export type PlatformStatus = (typeof platformStatus)[keyof typeof platformStatus] | 'unknown';
export const statusOf = (code: number): PlatformStatus =>
  (platformStatus as Record<number, PlatformStatus | undefined>)[code] ?? 'unknown';
