import React, { useState, useEffect } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, LAST_LOGIN_KEY } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import { getApiErrorMessage } from "../api/errorMessage";
import { authText } from "../i18n/authTexts";
import AuthLanguageBar from "../components/AuthLanguageBar";

const extra: Record<string, Record<string, string>> = {
  pt: { hello: "Olá,", enterPin: "Digite o seu PIN", notMe: "Não sou eu? Entrar com outro número", fillPin: "Digite o seu PIN." },
  crl: { hello: "Olá,", enterPin: "Skrebi bu PIN", notMe: "Ka N ki? Entra ku otu númeru", fillPin: "Skrebi bu PIN." },
  fr: { hello: "Bonjour,", enterPin: "Saisissez votre code", notMe: "Ce n'est pas vous ? Autre numéro", fillPin: "Saisissez votre code." },
};

interface SavedLogin {
  phone: string;
  name: string;
  role: string;
}

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { language } = useLanguage();
  const tx = (key: string) => extra[language]?.[key] ?? authText(language, key);

  const [saved, setSaved] = useState<SavedLogin | null>(null);
  const [useEmail, setUseEmail] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_LOGIN_KEY)
      .then((value) => {
        if (value) {
          try {
            setSaved(JSON.parse(value));
          } catch (e) {
            setSaved(null);
          }
        }
      })
      .catch(() => setSaved(null));
  }, []);

  const pinOnly = !!saved && !useEmail;

  async function forgetSaved() {
    await AsyncStorage.removeItem(LAST_LOGIN_KEY);
    setSaved(null);
    setPassword("");
  }

  function changeMode() {
    setUseEmail(!useEmail);
    setIdentifier("");
    setPassword("");
  }

  async function handleLogin() {
    const who = pinOnly && saved ? saved.phone : identifier.trim();
    if (!who || !password) {
      Alert.alert(tx("attention"), pinOnly ? tx("fillPin") : useEmail ? tx("fillEmailPass") : tx("fillPhonePin"));
      return;
    }

    setLoading(true);
    try {
      await login(who, password);
    } catch (error: any) {
      Alert.alert(tx("errorTitle"), getApiErrorMessage(error, tx("loginFail")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.flex} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <AuthLanguageBar />
        <Text style={s.title}>NôdjuntaAgro GB</Text>

        {pinOnly && saved ? (
          <>
            <Text style={s.hello}>{tx("hello")}</Text>
            <Text style={s.name}>{saved.name}</Text>
            <TextInput
              style={s.input}
              placeholder={tx("enterPin")}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(v) => setPassword(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              autoFocus
            />
          </>
        ) : (
          <>
            <Text style={s.subtitle}>{tx("loginSubtitle")}</Text>
            <TextInput
              style={s.input}
              placeholder={useEmail ? tx("emailPlaceholder") : tx("phonePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType={useEmail ? "email-address" : "phone-pad"}
            />
            {useEmail ? (
              <TextInput
                style={s.input}
                placeholder={tx("passwordPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            ) : (
              <TextInput
                style={s.input}
                placeholder={tx("pinPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={(v) => setPassword(v.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
              />
            )}
          </>
        )}

        <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.buttonText}>{tx("login")}</Text>}
        </TouchableOpacity>

        {pinOnly ? (
          <TouchableOpacity onPress={forgetSaved}>
            <Text style={s.link}>{tx("notMe")}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={s.link}>{tx("noAccount")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={changeMode}>
              <Text style={s.linkSmall}>{useEmail ? tx("usePhone") : tx("useEmail")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  title: { fontSize: 28, fontWeight: "bold", color: colors.primary, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: "center", marginBottom: 32 },
  hello: { fontSize: 16, color: colors.textSecondary, textAlign: "center", marginTop: 16 },
  name: { fontSize: 22, fontWeight: "bold", color: colors.text, textAlign: "center", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: colors.surface, marginBottom: 16 },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  link: { color: colors.primary, textAlign: "center", marginTop: 20, fontSize: 14 },
  linkSmall: { color: colors.textSecondary, textAlign: "center", marginTop: 16, fontSize: 12 },
});
