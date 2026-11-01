// SOP-DEL-02 §3 — "client short code (up to 8 letters)", the first segment of the Project ID
// CLIENT-CC-CITY-NNN (D-18). The evaluator reads only this config. A new SOP version updates this file.
export const clientShortCodeRule = {
  cite: 'SOP-DEL-02 §3',
  sopVersion: '1.4',
  /** "up to 8 letters". */
  maxLetters: 8,
  /** Latin capitals only: the code is part of DingTalk folder names and mail subjects. */
  letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const;
