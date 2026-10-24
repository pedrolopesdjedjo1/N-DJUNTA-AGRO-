import React from "react";
import { View, StyleSheet } from "react-native";
import { RoleTabs, TabDef } from "./MerchantTabs";
import { colors } from "../theme/colors";

export const AGENT_TABS: TabDef[] = [
  { key: "AgentHome", icon: "🏠", label: "Início" },
  { key: "AgentClients", icon: "👥", label: "Clientes" },
  { key: "AgentMarket", icon: "🛒", label: "Mercado" },
  { key: "AgentOrders", icon: "📦", label: "Encomendas" },
  { key: "AgentProfile", icon: "👤", label: "Perfil" },
];

export function AgentLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <View style={s.layout}>
      <View style={s.content}>{children}</View>
      <RoleTabs active={active} tabs={AGENT_TABS} />
    </View>
  );
}

const s = StyleSheet.create({
  layout: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
});
