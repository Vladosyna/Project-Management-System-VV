// The reader's language choice, remembered in this browser only.
import { languages, type Language } from '@ocs/i18n';

const KEY = 'ocs.language';

export function preferredLanguage(): Language {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && (languages as readonly string[]).includes(saved)) return saved as Language;
  } catch {
    // storage blocked: fall back to the browser language
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function rememberLanguage(language: Language): void {
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
}
