import React from 'react';
import LanguageComboBox from './LanguageComboBox';
import { useLanguage } from './LanguageContext';

export default function LanguageSwitcherBox({ onChange }: { onChange?: (lang: string) => void }) {
  const { lang, setLang } = useLanguage();
  const handleChange = (newLang: string) => {
    setLang(newLang);
    if (onChange) onChange(newLang);
  };
  return (
    <LanguageComboBox value={lang} onChange={handleChange} />
  );
}
