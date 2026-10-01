import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Lang, translations } from "../i18n/translations";

const STORAGE_KEY = "@nodjuntaagro:language";

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
        if (saved === "pt" || saved === "fr" || saved === "crl") {
          setLanguageState(saved);
        }
      } catch (e) {
        console.log("Erro ao ler idioma", e);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Lang) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      console.log("Erro ao salvar idioma", e);
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      return translations[language][key] ?? translations.pt[key] ?? key;
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
