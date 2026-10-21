import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Default to Hindi ('hi') for Indian farmers, allow switching to English ('en')
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('mandidarpan_lang') || 'hi';
  });

  useEffect(() => {
    localStorage.setItem('mandidarpan_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'hi' ? 'en' : 'hi'));
  };

  const t = translations[lang] || translations.hi;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
