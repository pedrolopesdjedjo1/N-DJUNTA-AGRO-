import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import { getApiErrorMessage } from "../api/errorMessage";
import { authText } from "../i18n/authTexts";
import AuthLanguageBar from "../components/AuthLanguageBar";

// Cliente (COMPRADOR) vem primeiro e já marcado: qualquer pessoa pode ter conta
const ROLES = ["COMPRADOR", "AGRICULTOR", "PESCADOR", "COMERCIANTE", "TRANSPORTADOR"];

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const { language } = useLanguage();
  const tx = (key: string) => authText(language, key);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinRepeat, setPinRepeat] = useState("");
  const [role, setRole] = useState("COMPRADOR");
  const [location, setLocation] = useState("");
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
      <ScrollView style={s.flex} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <AuthLanguageBar />
        <Text style={s.title}>{tx("createAccount")}</Text>
        <Text style={s.subtitle}>{tx("registerSubtitle")}</Text>

        <TextInput style={s.input} placeholder={tx("fullName")} placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />

        <TextInput style={s.input} placeholder={tx("phonePlaceholder")} placeholderTextColor={colors.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <TextInput
          style={s.input}
          placeholder={tx("pinCreate")}
          placeholderTextColor={colors.textSecondary}
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
        />

        <TextInput
          style={s.input}
          placeholder={tx("pinRepeat")}
          placeholderTextColor={colors.textSecondary}
          value={pinRepeat}
          onChangeText={(v) => setPinRepeat(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
        />
        <Text style={s.hint}>{tx("pinHint")}</Text>

        <TextInput style={s.input} placeholder={tx("region")} placeholderTextColor={colors.textSecondary} value={location} onChangeText={setLocation} />

        <Text style={s.label}>{tx("iAm")}</Text>
        <View style={s.roleContainer}>
          {ROLES.map((r) => (
            <TouchableOpacity key={r} style={[s.roleChip, role === r && s.roleChipActive]} onPress={() => setRole(r)}>
              <Text style={[s.roleText, role === r && s.roleTextActive]}>{tx(`role_${r}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.hint}>{tx("clientHint")}</Text>

        <TouchableOpacity style={s.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.buttonText}>{tx("createAccount")}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={s.link}>{tx("alreadyAccount")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  title: { fontSize: 28, fontWeight: "bold", color: colors.primary, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: "center", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: colors.surface, marginBottom: 16 },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: -8, marginBottom: 16 },
  label: { fontSize: 14, color: colors.text, marginBottom: 8, fontWeight: "600" },
  roleContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  roleChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { color: colors.text, fontSize: 14 },
  roleTextActive: { color: colors.white, fontWeight: "600" },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  link: { color: colors.primary, textAlign: "center", marginTop: 20, fontSize: 14 },
});
