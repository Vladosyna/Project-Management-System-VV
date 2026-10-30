import { en } from './catalog/en.ts';
import { zh } from './catalog/zh.ts';
import type { Catalog, Language, MessageKey } from './types.ts';

export const catalogs: Readonly<Record<Language, Catalog>> = { en, zh };

/** The text for `key` in `language`, with `{placeholders}` filled from `params`. */
export function translate(language: Language, key: MessageKey, params: Record<string, string> = {}): string {
  return catalogs[language][key].replace(/\{(\w+)\}/g, (whole, name: string) => params[name] ?? whole);
}
