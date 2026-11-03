// MAC spellings seen on packing lists and switches (aa-bb-cc-dd-ee-ff, aabb.ccdd.eeff, AABBCCDDEEFF) → the
// stored form AA:BB:CC:DD:EE:FF (migration 0007 CHECK). Undefined when it is not a MAC at all.
export function normaliseMac(raw: string): string | undefined {
  const hex = raw.replace(/[\s:.-]/g, '').toUpperCase();
  if (!/^[0-9A-F]{12}$/.test(hex)) return undefined;
  return (hex.match(/.{2}/g) ?? []).join(':');
}
