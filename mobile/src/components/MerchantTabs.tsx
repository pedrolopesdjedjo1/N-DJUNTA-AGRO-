import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export const MERCHANT_TABS = [
  { key: "MerchantHome", icon: "🏠", label: "Início" },
  { key: "MerchantProducts", icon: "📦", label: "Produtos" },
  { key: "MerchantOrders", icon: "🛒", label: "Pedidos" },
  { key: "MerchantSales", icon: "💰", label: "Vendas" },
  { key: "StoreProfile", icon: "👤", label: "Perfil" },
];

export default function MerchantTabs({ active }: { active: string }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: 6 + insets.bottom }]}>
      {MERCHANT_TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity key={tab.key} style={s.tab} onPress={() => !isActive && navigation.navigate(tab.key)}>
            <Text style={[s.icon, !isActive && s.dim]}>{tab.icon}</Text>
            <Text style={[s.label, isActive && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function MerchantLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <View style={s.layout}>
      <View style={s.content}>{children}</View>
      <MerchantTabs active={active} />
    </View>
  );
}

const s = StyleSheet.create({
  layout: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  bar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingTop: 6 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  icon: { fontSize: 20 },
  dim: { opacity: 0.55 },
  label: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  labelActive: { color: colors.primary, fontWeight: "bold" },
});
