import React, { useState } from "react";
import {
  View,
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import { getApiErrorMessage } from "../api/errorMessage";
import { authText } from "../i18n/authTexts";
import AuthLanguageBar from "../components/AuthLanguageBar";

// Cliente (COMPRADOR) vem primeiro e já marcado: qualquer pessoa pode ter conta
const ROLES = ["COMPRADOR", "AGRICULTOR", "PESCADOR", "COMERCIANTE", "TRANSPORTADOR", "ARTESANATO"];

const ROLE_ICON: Record<string, any> = {
  COMPRADOR: "bag-handle-outline",
  AGRICULTOR: "leaf-outline",
  PESCADOR: "fish-outline",
  COMERCIANTE: "storefront-outline",
  TRANSPORTADOR: "car-outline",
  ARTESANATO: "color-palette-outline",
};

// Textos de reserva (usados só se o ficheiro authTexts não tiver a chave)
const FALLBACK: Record<string, Record<string, string>> = {
  pt: {
    role_ARTESANATO: "Artesanato",
    clientHint: "Quer só comprar? Escolha Comprador. Qualquer pessoa pode ter conta.",
  },
  kr: {
    role_ARTESANATO: "Artizanatu",
    clientHint: "Bu misti so kumpra? Skodja Kumpradur. Kualker pesoa pode ten kunta.",
  },
  fr: {
    role_ARTESANATO: "Artisanat",
    clientHint: "Vous voulez seulement acheter ? Choisissez Acheteur. Tout le monde peut créer un compte.",
  },
};

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const { language } = useLanguage();
  const tx = (key: string) => authText(language, key);

  const lang = String(language || "").toLowerCase();
  const fbLang = lang.startsWith("fr")
    ? "fr"
    : lang.startsWith("kr") || lang.startsWith("cr") || lang.includes("kri")
    ? "kr"
    : "pt";

  // Usa o texto do authTexts; se não existir (devolve a própria chave), usa o de reserva
  const t = (key: string) => {
    const v = tx(key);
    if (v && v !== key) return v;
    return FALLBACK[fbLang][key] ?? key;
  };

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinRepeat, setPinRepeat] = useState("");
  const [role, setRole] = useState("COMPRADOR");
  const [location, setLocation] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const phoneDigits = phone.replace(/\D/g, "");

    if (!name.trim() || !phone.trim() || !pin) {
      Alert.alert(tx("attention"), tx("fillAll"));
      return;
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      Alert.alert(tx("attention"), tx("phoneInvalid"));
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      Alert.alert(tx("attention"), tx("pinInvalid"));
      return;
    }
    if (pin !== pinRepeat) {
      Alert.alert(tx("attention"), tx("pinMismatch"));
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        phone: phone.trim(),
        password: pin,
        role,
        location: location.trim() || undefined,
      });
    } catch (error: any) {
      Alert.alert(tx("errorTitle"), getApiErrorMessage(error, tx("registerFail")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <ScrollView style={s.flex} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Topo verde */}
        <View style={s.hero}>
          <TouchableOpacity style={s.back} onPress={() => navigation.navigate("Login")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={s.logoRing}>
            <Ionicons name="leaf" size={28} color={colors.primaryDark} />
          </View>
          <Text style={s.title}>{tx("createAccount")}</Text>
          <Text style={s.subtitle}>{tx("registerSubtitle")}</Text>
        </View>

        {/* Cartão do formulário */}
        <View style={s.card}>
          <AuthLanguageBar />

          <View style={s.field}>
            <Ionicons name="person-outline" size={20} color={colors.muted} />
            <TextInput style={s.input} placeholder={tx("fullName")} placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
          </View>

          <View style={s.field}>
            <Ionicons name="call-outline" size={20} color={colors.muted} />
            <TextInput style={s.input} placeholder={tx("phonePlaceholder")} placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>

          <View style={s.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
            <TextInput
              style={s.input}
              placeholder={tx("pinCreate")}
              placeholderTextColor={colors.muted}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry={!showPin}
            />
            <TouchableOpacity onPress={() => setShowPin(!showPin)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPin ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={s.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
            <TextInput
              style={s.input}
              placeholder={tx("pinRepeat")}
              placeholderTextColor={colors.muted}
              value={pinRepeat}
              onChangeText={(v) => setPinRepeat(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry={!showPin}
            />
          </View>
          <Text style={s.hint}>{tx("pinHint")}</Text>

          <View style={s.field}>
            <Ionicons name="location-outline" size={20} color={colors.muted} />
            <TextInput style={s.input} placeholder={tx("region")} placeholderTextColor={colors.muted} value={location} onChangeText={setLocation} />
          </View>

          <Text style={s.label}>{tx("iAm")}</Text>
          <View style={s.roleContainer}>
            {ROLES.map((r) => {
              const active = role === r;
              return (
                <TouchableOpacity key={r} style={[s.roleChip, active && s.roleChipActive]} onPress={() => setRole(r)} activeOpacity={0.85}>
                  <Ionicons name={ROLE_ICON[r]} size={16} color={active ? colors.white : colors.primary} />
                  <Text style={[s.roleText, active && s.roleTextActive]}>{t(`role_${r}`)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.hint}>{t("clientHint")}</Text>

          <TouchableOpacity style={[s.button, loading && s.buttonOff]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.buttonText}>{tx("createAccount")}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={s.link}>{tx("alreadyAccount")}</Text>
          </TouchableOpacity>
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
    paddingTop: 52,
    paddingBottom: 62,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  back: { position: "absolute", left: 18, top: 48, zIndex: 2 },
  logoRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: "900", color: colors.white, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.primarySoft, textAlign: "center", marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: -36,
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
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: -6, marginBottom: 14 },
  label: { fontSize: 14, color: colors.text, marginBottom: 10, fontWeight: "800" },
  roleContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { color: colors.text, fontSize: 14, fontWeight: "600", marginLeft: 6 },
  roleTextActive: { color: colors.white, fontWeight: "800" },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonOff: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  link: { color: colors.primary, textAlign: "center", marginTop: 20, fontSize: 14, fontWeight: "600" },
});
