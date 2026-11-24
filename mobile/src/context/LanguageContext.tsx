import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGES, translations } from "../i18n/translations";
import type { Lang } from "../i18n/translations";
import { setCurrentLang } from "../i18n/autoTranslate";

// O LanguageScreen pode importar daqui: mantemos estas exportações
export { LANGUAGES };
export type { Lang };

const STORAGE_KEY = "@nodjuntaagro:language";

function normalize(code: any): Lang {
  const c = String(code ?? "").toLowerCase().trim();
  if (c === "kr" || c === "crl" || c === "kriol" || c === "cv") return "crl";
  if (c === "fr" || c === "fr-fr" || c === "francais" || c === "français") return "fr";
  return "pt";
}

type Ctx = {
  language: Lang;
  setLanguage: (code: any) => Promise<void>;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<Ctx>({
  language: "pt",
  setLanguage: async () => {},
  t: (key: string, fallback?: string) => fallback ?? key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Lang>("pt");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const l = normalize(saved);
          setCurrentLang(l);
          setLang(l);
        }
      } catch {}
    })();
  }, []);

  const setLanguage = useCallback(async (code: any) => {
    const l = normalize(code);
    setCurrentLang(l);
    setLang(l);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const all: any = translations || {};
      const dict: any = all[language] || all.pt || {};
      const base: any = all.pt || {};
      const v = dict[key] ?? base[key];
      return typeof v === "string" ? v : fallback ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
