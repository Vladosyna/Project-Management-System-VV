// Language for the whole UI. The app owns the choice (and where it is remembered); components read t().
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { translate, type Language, type MessageKey } from '@ocs/i18n';

interface I18nValue {
  readonly language: Language;
  readonly t: (key: MessageKey, params?: Record<string, string>) => string;
  readonly setLanguage: (language: Language) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider(props: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  children: ReactNode;
}) {
  const { language, onLanguageChange } = props;
  const value = useMemo<I18nValue>(
    () => ({
      language,
      t: (key, params) => translate(language, key, params),
      setLanguage: onLanguageChange,
    }),
    [language, onLanguageChange],
  );
  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n() outside <I18nProvider>');
  return value;
}
