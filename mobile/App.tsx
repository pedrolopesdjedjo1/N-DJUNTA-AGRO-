import "./src/i18n/patchText";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { LanguageProvider, useLanguage } from "./src/context/LanguageContext";
import AppNavigator from "./src/navigation/AppNavigator";

// A chave faz todos os ecrãs serem redesenhados quando o idioma muda,
// sem mexer no login.
function Root() {
  const { language } = useLanguage();
  return <AppNavigator key={language} />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Root />
      </AuthProvider>
    </LanguageProvider>
  );
}
