// Name rules shared by the generators. Permission key segments allow letters only (kernel/permissions.ts),
// so generated names do too.

/** Folders that are part of the core skeleton, not business modules. */
const RESERVED_MODULES = ['kernel', 'permissions', 'runtime'];

export function assertModule(name: string): void {
  if (!/^[a-z]+$/.test(name))
    throw new Error(`Module "${name}": one lowercase word, letters only (e.g. intake)`);
  if (RESERVED_MODULES.includes(name)) throw new Error(`Module "${name}" is reserved`);
}

/** `set-eta` → ['set', 'eta']. Lowercase words separated by hyphens, letters only. */
export function words(name: string, what: string): string[] {
  if (!/^[a-z]+(-[a-z]+)*$/.test(name)) {
    throw new Error(`${what} "${name}": lowercase words separated by hyphens, letters only (e.g. set-eta)`);
  }
  return name.split('-');
}

const upper = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

/** ['set', 'eta'] → setEta */
export const camel = (ws: readonly string[]): string => ws.map((w, i) => (i === 0 ? w : upper(w))).join('');

/** ['set', 'eta'] → Set eta */
export const sentence = (ws: readonly string[]): string => upper(ws.join(' '));

/** A permission key for `module`: `<module>.<object>.<action>`, camelCase segments. */
export function assertPermissionKey(key: string, module: string): void {
  const parts = key.split('.');
  if (parts.length !== 3 || !parts.every((p) => /^[a-z][a-zA-Z]*$/.test(p)) || parts[0] !== module) {
    throw new Error(`Permission key "${key}": use ${module}.<object>.<action> in camelCase`);
  }
}
