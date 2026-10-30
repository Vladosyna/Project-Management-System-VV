// pnpm --filter @ocs/ui gen:tokens — rewrites styles/tokens.css from tokens.ts.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderTokensCss } from '../css.ts';

const target = fileURLToPath(new URL('../styles/tokens.css', import.meta.url));
writeFileSync(target, renderTokensCss());
console.log(`Wrote ${target}`);
