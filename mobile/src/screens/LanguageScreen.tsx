import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

export default function LanguageScreen({ navigation }: any) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("chooseLanguage")}</Text>

      {LANGUAGES.map((item) => {
        const active = language === item.code;
        return (
          <TouchableOpacity
            key={item.code}
            style={[styles.option, active && styles.optionActive]}
            onPress={async () => {
              await setLanguage(item.code);
              navigation.goBack();
            }}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {item.label}
            </Text>
            {active ? <Text style={styles.check}>✓</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1B5E20", marginBottom: 16 },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  optionActive: { backgroundColor: "#1B5E20", borderColor: "#1B5E20" },
  optionText: { fontSize: 16, color: "#222" },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  check: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
