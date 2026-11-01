// SOP-DEL-02 §3 — "Project ID: CLIENT-CC-CITY-NNN — client short code (up to 8 letters), ISO country code,
// 3-letter city code (IATA where one exists), running number within that client and city" (D-18).
// The evaluator reads only this config. A new SOP version updates this file.
export const projectIdRule = {
  cite: 'SOP-DEL-02 §3',
  sopVersion: '1.4',
  /** ISO 3166-1 alpha-2. */
  countryLetters: 2,
  /** IATA city code where one exists, otherwise another 3-letter code. */
  cityLetters: 3,
  /** NNN: the running number is written with three digits, so 999 sites per client and city. */
  runningDigits: 3,
  letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const;
