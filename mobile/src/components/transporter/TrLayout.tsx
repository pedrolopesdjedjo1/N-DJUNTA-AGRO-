import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TR_TABS } from "../../constants/transporterV2";
import { colors } from "../../theme/colors";

function TrTabBar({ active }: { active: string }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFFFFF", paddingBottom: insets.bottom }}>
      {TR_TABS.map((t) => {
        const on = t.key === active;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.8}
            onPress={() => (on ? null : navigation.navigate(t.key))}
            style={{ flex: 1, alignItems: "center", paddingVertical: 7 }}
          >
            <Text style={{ fontSize: 21, opacity: on ? 1 : 0.55 }}>{t.icon}</Text>
            <Text style={{ fontSize: 10.5, marginTop: 1, fontWeight: on ? "bold" : "normal", color: on ? colors.primary : colors.textSecondary }} numberOfLines={1}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Envolve as telas do Transportador e põe a barra: Início | Entregas | Mapa | Ganhos | Perfil
export default function TrLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>{children}</View>
      <TrTabBar active={active} />
    </View>
  );
}
