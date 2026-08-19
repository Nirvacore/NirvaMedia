import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, localeNames, speechLocales, type Locale, type Translations } from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  localeNames: Record<Locale, string>;
  speechLocale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("nirva-locale") as Locale) || "th";
    }
    return "th";
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("nirva-locale", newLocale);
  };

  const t = translations[locale];
  const speechLocale = speechLocales[locale];

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, localeNames, speechLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
