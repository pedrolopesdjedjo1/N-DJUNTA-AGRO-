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
          setCurrentLang(saved);
          setLanguageState(saved);
        }
      } catch (e) {
        console.log("Erro ao ler idioma", e);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Lang) => {
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
      return translations[language][key] ?? translations.pt[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {/* A chave faz a app redesenhar todos os ecrãs quando o idioma muda */}
      <React.Fragment key={language}>{children}</React.Fragment>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
