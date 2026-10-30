import type { en } from './catalog/en.ts';

export const languages = ['en', 'zh'] as const;
export type Language = (typeof languages)[number];

/** Every user-visible string in OCS is one of these keys (03-engineering-rules §8). */
export type MessageKey = keyof typeof en;

/** A catalogue must define exactly the keys of the English one. */
export type Catalog = Readonly<Record<MessageKey, string>>;
