// SOP-DEL-02 §3 — Project ID evaluator. Reads only ./project-id.config.ts; refuses with RuleViolation citing
// the clause. The client short code itself is checked by ./client-short-code.ts when the client is created.
import { RuleViolation } from '../../kernel/index.ts';
import { projectIdRule } from './project-id.config.ts';

export interface ProjectIdParts {
  readonly shortCode: string;
  readonly countryCode: string;
  readonly cityCode: string;
  readonly runningNo: number;
}

const isCode = (value: string, length: number): boolean => {
  if (value.length !== length) return false;
  for (const c of value) if (!projectIdRule.letters.includes(c)) return false;
  return true;
};

/** CLIENT-CC-CITY-NNN, e.g. CLIENTA-ES-MAD-001. Throws when a part does not fit the clause. */
export function projectIdOf(parts: ProjectIdParts): string {
  const { cite, countryLetters, cityLetters, runningDigits } = projectIdRule;
  if (!isCode(parts.countryCode, countryLetters)) {
    throw new RuleViolation(
      cite,
      `country "${parts.countryCode}" must be an ISO code of ${String(countryLetters)} letters`,
    );
  }
  if (!isCode(parts.cityCode, cityLetters)) {
    throw new RuleViolation(
      cite,
      `city "${parts.cityCode}" must be a code of ${String(cityLetters)} letters`,
    );
  }
  const max = 10 ** runningDigits - 1;
  if (!Number.isInteger(parts.runningNo) || parts.runningNo < 1 || parts.runningNo > max) {
    throw new RuleViolation(cite, `running number ${String(parts.runningNo)} must be 1 to ${String(max)}`);
  }
  const nnn = String(parts.runningNo).padStart(runningDigits, '0');
  return `${parts.shortCode}-${parts.countryCode}-${parts.cityCode}-${nnn}`;
}
