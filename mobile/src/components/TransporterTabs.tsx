import React from "react";
import { View, StyleSheet } from "react-native";
import { RoleTabs, TabDef } from "./MerchantTabs";
import { colors } from "../theme/colors";

export const TRANSPORTER_TABS: TabDef[] = [
  { key: "TransporterHome", icon: "🏠", label: "Início" },
  { key: "TransporterDeliveries", icon: "📦", label: "Entregas" },
  { key: "TransporterEarnings", icon: "💰", label: "Ganhos" },
  { key: "TransporterMap", icon: "🗺️", label: "Mapa" },
  { key: "TransporterProfile", icon: "👤", label: "Perfil" },
];

export function TransporterLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <View style={s.layout}>
      <View style={s.content}>{children}</View>
      <RoleTabs active={active} tabs={TRANSPORTER_TABS} />
    </View>
  );
}

const s = StyleSheet.create({
  layout: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
});
