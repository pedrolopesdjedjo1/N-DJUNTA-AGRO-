import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { LANGUAGES } from "../i18n/translations";
import { colors } from "../theme/colors";

export default function AuthLanguageBar() {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={s.row}>
      {LANGUAGES.map((item) => {
        const active = language === item.code;
        return (
          <TouchableOpacity
            key={item.code}
            style={[s.chip, active && s.chipActive]}
            onPress={() => setLanguage(item.code)}
          >
            <Text style={[s.text, active && s.textActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 4 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text, fontSize: 13 },
  textActive: { color: colors.white, fontWeight: "600" },
});
