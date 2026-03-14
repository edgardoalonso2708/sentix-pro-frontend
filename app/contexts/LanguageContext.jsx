'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { translations } from '../lib/translations';

const LanguageContext = createContext({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sentix-lang') || 'es';
    }
    return 'es';
  });

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sentix-lang', newLang);
    }
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations.es?.[key] || key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
