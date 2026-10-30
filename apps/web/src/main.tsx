import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import type { Language } from '@ocs/i18n';
import { I18nProvider } from '@ocs/ui';
import { preferredLanguage, rememberLanguage } from './language.ts';
import { router } from './routes.tsx';

function App() {
  const [language, setLanguage] = useState<Language>(preferredLanguage);
  return (
    <I18nProvider
      language={language}
      onLanguageChange={(next) => {
        rememberLanguage(next);
        setLanguage(next);
        document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
      }}
    >
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('#root missing in index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
