// PR size limit (03-engineering-rules §2): ≤ 400 changed lines, excluding lockfiles, vendored and
// reference content. The architect role can allow a larger PR with the label `size-exception`.
// Usage: node tools/ci/pr-size.mjs <base-ref>   (env PR_LABELS: comma-separated label names)
import { execFileSync } from 'node:child_process';

const LIMIT = 400;
const EXCLUDED = [
  /^pnpm-lock\.yaml$/,
  /^\.claude\/skills\/(?!ocs-)/, // vendored third-party skills (see .claude/skills/VENDOR.md)
  /^docs\/ocs\/reference\//,
  /^docs\/ocs\/domain\/sop\//,
];

const base = process.argv[2];
if (!base) {
  console.error('usage: node tools/ci/pr-size.mjs <base-ref>');
  process.exit(2);
}

const numstat = execFileSync('git', ['diff', '--numstat', `${base}...HEAD`], { encoding: 'utf8' });
let total = 0;
const counted = [];
for (const line of numstat.trim().split('\n').filter(Boolean)) {
  const [added, deleted, file] = line.split('\t');
  if (!file || EXCLUDED.some((re) => re.test(file))) continue;
  const n = (Number(added) || 0) + (Number(deleted) || 0); // binary files show "-"
  total += n;
  counted.push([n, file]);
}

const labels = (process.env.PR_LABELS ?? '').split(',').map((l) => l.trim());
console.log(`Changed lines (excluding lockfiles and vendored content): ${total} / ${LIMIT}`);
if (total <= LIMIT) process.exit(0);
if (labels.includes('size-exception')) {
  console.log('Over the limit, allowed by the "size-exception" label (architect role).');
  process.exit(0);
}
console.log('Largest files:');
for (const [n, file] of counted.sort((a, b) => b[0] - a[0]).slice(0, 10)) console.log(`  ${n}\t${file}`);
console.error(
  `PR is larger than ${LIMIT} changed lines. Split it into smaller PRs (03-engineering-rules §2).`,
);
process.exit(1);
