import { createContext, useContext } from 'react';
import translations from '../utils/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const lang = 'en';

  const t = (key) => {
    return translations['en']?.[key] || key;
  };

  const switchLanguage = () => {
    // No-op since English is hardcoded
  };

  return (
    <LanguageContext.Provider value={{ lang, t, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

