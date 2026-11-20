import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, LAST_LOGIN_KEY } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import { getApiErrorMessage } from "../api/errorMessage";
import { authText } from "../i18n/authTexts";
import AuthLanguageBar from "../components/AuthLanguageBar";

const extra: Record<string, Record<string, string>> = {
  pt: { hello: "Olá,", enterPin: "Digite o seu PIN", notMe: "Não sou eu? Entrar com outro número", fillPin: "Digite o seu PIN.", slogan: "JUNTOS, FAZEMOS ACONTECER." },
  crl: { hello: "Olá,", enterPin: "Skrebi bu PIN", notMe: "Ka N ki? Entra ku otu númeru", fillPin: "Skrebi bu PIN.", slogan: "JUNTU, NU TA FASI AKONTESI." },
  fr: { hello: "Bonjour,", enterPin: "Saisissez votre code", notMe: "Ce n'est pas vous ? Autre numéro", fillPin: "Saisissez votre code.", slogan: "ENSEMBLE, NOUS FAISONS BOUGER LES CHOSES." },
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
  const [showPass, setShowPass] = useState(false);
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

  const passwordIsPin = pinOnly || !useEmail;

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <ScrollView style={s.flex} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Topo verde com a marca */}
        <View style={s.hero}>
          <View style={s.logoRing}>
            <View style={s.logoCore}>
              <Ionicons name="leaf" size={38} color={colors.primaryDark} />
            </View>
          </View>
          <Text style={s.brand}>NÔ DJUNTA</Text>
          <Text style={s.brandGold}>AGRO</Text>
          <Text style={s.slogan}>{tx("slogan")}</Text>
        </View>

        {/* Cartão branco do formulário */}
        <View style={s.card}>
          <AuthLanguageBar />

          {pinOnly && saved ? (
            <>
              <Text style={s.hello}>{tx("hello")}</Text>
              <Text style={s.name}>{saved.name}</Text>
            </>
          ) : (
            <Text style={s.subtitle}>{tx("loginSubtitle")}</Text>
          )}

          {!pinOnly ? (
            <View style={s.field}>
              <Ionicons name={useEmail ? "mail-outline" : "call-outline"} size={20} color={colors.muted} />
              <TextInput
                style={s.input}
                placeholder={useEmail ? tx("emailPlaceholder") : tx("phonePlaceholder")}
                placeholderTextColor={colors.muted}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType={useEmail ? "email-address" : "phone-pad"}
              />
            </View>
          ) : null}

          <View style={s.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
            <TextInput
              style={s.input}
              placeholder={pinOnly ? tx("enterPin") : useEmail ? tx("passwordPlaceholder") : tx("pinPlaceholder")}
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={(v) => setPassword(passwordIsPin ? v.replace(/\D/g, "").slice(0, 6) : v)}
              keyboardType={passwordIsPin ? "number-pad" : "default"}
              maxLength={passwordIsPin ? 6 : undefined}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoFocus={pinOnly}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.button, loading && s.buttonOff]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.buttonText}>{tx("login")}</Text>}
          </TouchableOpacity>

          {pinOnly ? (
            <TouchableOpacity onPress={forgetSaved}>
              <Text style={s.link}>{tx("notMe")}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={s.registerBtn} onPress={() => navigation.navigate("Register")} activeOpacity={0.85}>
                <Text style={s.registerText}>{tx("noAccount")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={changeMode}>
                <Text style={s.linkSmall}>{useEmail ? tx("usePhone") : tx("useEmail")}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primary,
    alignItems: "center",
    paddingTop: 64,
    paddingBottom: 72,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  logoRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoCore: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 30, fontWeight: "900", color: colors.white, letterSpacing: 3 },
  brandGold: { fontSize: 22, fontWeight: "800", color: colors.gold, letterSpacing: 8, marginTop: 2 },
  slogan: { fontSize: 11, fontWeight: "700", color: colors.primarySoft, letterSpacing: 1.5, marginTop: 14, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: -40,
    marginBottom: 32,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  subtitle: { fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 18 },
  hello: { fontSize: 15, color: colors.textSecondary, textAlign: "center" },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: 18 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, color: colors.text },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonOff: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  registerBtn: {
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  registerText: { color: colors.black, fontSize: 15, fontWeight: "700" },
  link: { color: colors.primary, textAlign: "center", marginTop: 20, fontSize: 14, fontWeight: "600" },
  linkSmall: { color: colors.textSecondary, textAlign: "center", marginTop: 16, fontSize: 13 },
});
