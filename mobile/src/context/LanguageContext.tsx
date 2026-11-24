import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Lang, translations } from "../i18n/translations";
import { setCurrentLang } from "../i18n/autoTranslate";

const STORAGE_KEY = "@nodjuntaagro:language";

// Aceita também outros nomes usados na app para o mesmo idioma
function normalize(code: any): Lang {
  const c = String(code ?? "").toLowerCase();
  if (c === "fr") return "fr";
  if (c === "crl" || c === "kr" || c === "kriol" || c === "cv") return "crl";
  return "pt";
}

type LanguageContextValue = {
  language: Lang;
  setLanguage: (lang: Lang) => Promise<void>;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "pt",
  setLanguage: async () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Lang>("pt");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const lang = normalize(saved);
          setCurrentLang(lang);
          setLanguageState(lang);
        }
      } catch (e) {
        console.log("Erro ao ler idioma", e);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (code: Lang) => {
    const lang = normalize(code);
    setCurrentLang(lang);
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.log("Erro ao salvar idioma", e);
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      const all: any = translations;
      const dict = (all && all[language]) || (all && all.pt) || {};
      const pt = (all && all.pt) || {};
      return dict[key] ?? pt[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
