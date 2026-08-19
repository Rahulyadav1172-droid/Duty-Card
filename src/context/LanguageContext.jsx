import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('duty_card_lang') || 'hi';
  });

  useEffect(() => {
    localStorage.setItem('duty_card_lang', language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'hi' ? 'en' : 'hi'));
  };

  const t = (key, fallback = '') => {
    if (!key) return fallback;
    const currentLangDict = translations[language] || translations.hi;
    return currentLangDict[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'hi',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (k, fb) => fb || k
    };
  }
  return context;
}
