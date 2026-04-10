import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations } from "../lib/translations";

type Language = "es" | "en";

interface LanguageContextType {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Language>(() => {
    const saved = localStorage.getItem("crm_language");
    return (saved === "es" || saved === "en") ? saved : "es";
  });

  const setLocale = (lang: Language) => {
    localStorage.setItem("crm_language", lang);
    setLocaleState(lang);
  };

  const t = (key: string): string => {
    const langDict = translations[locale];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback exactly to the key if not found
    return key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
