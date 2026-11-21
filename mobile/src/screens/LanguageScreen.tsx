import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGES } from "../i18n/translations";
import { colors } from "../theme/colors";

const DETALHES: Record<string, { sigla: string; descricao: string }> = {
  pt: { sigla: "PT", descricao: "Língua oficial da Guiné-Bissau" },
  crl: { sigla: "KR", descricao: "Língua de todos os dias" },
  fr: { sigla: "FR", descricao: "Langue de la région" },
};

export default function LanguageScreen({ navigation }: any) {
  const { language, setLanguage, t } = useLanguage();

  async function escolher(code: any) {
    await setLanguage(code);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name="language" size={30} color={colors.primaryDark} />
        </View>
        <Text style={s.heroTitle}>{t("chooseLanguage")}</Text>
        <Text style={s.heroSub}>Português · Kriol · Français</Text>
      </View>

      {LANGUAGES.map((item) => {
        const ativo = language === item.code;
        const info = DETALHES[item.code] ?? { sigla: item.code.toUpperCase(), descricao: "" };
        return (
          <TouchableOpacity
            key={item.code}
            style={[s.row, ativo && s.rowActive]}
            activeOpacity={0.85}
            onPress={() => escolher(item.code)}
          >
            <View style={[s.badge, ativo && s.badgeActive]}>
              <Text style={[s.badgeText, ativo && s.badgeTextActive]}>{info.sigla}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.label}>{item.label}</Text>
              <Text style={s.desc}>{info.descricao}</Text>
            </View>
            {ativo ? (
              <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
            ) : (
              <Ionicons name="ellipse-outline" size={26} color={colors.border} />
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={s.done} activeOpacity={0.85} onPress={() => navigation.goBack()}>
        <Text style={s.doneText}>OK</Text>
      </TouchableOpacity>

      <Text style={s.note}>
        A escolha fica guardada neste aparelho. Os textos em Kriol ainda precisam de revisão por um falante nativo.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: "900", textAlign: "center" },
  heroSub: { color: colors.primarySoft, fontSize: 13, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  badgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  badgeText: { fontSize: 14, fontWeight: "900", color: colors.text },
  badgeTextActive: { color: colors.white },
  info: { flex: 1 },
  label: { fontSize: 17, fontWeight: "800", color: colors.text },
  desc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  done: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  doneText: { color: colors.black, fontSize: 16, fontWeight: "900" },
  note: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 16 },
});
