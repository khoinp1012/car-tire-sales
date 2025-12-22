import React, { createContext, useContext, useState, useCallback } from 'react';
import i18n from '@/constants/i18n';

const LanguageContext = createContext({
  lang: i18n.locale,
  setLang: (lang: string) => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState(i18n.locale);

  const setLang = useCallback((newLang: string) => {
    console.log('[LanguageContext] setLang called with:', newLang);
    i18n.locale = newLang;
    setLangState(newLang);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
