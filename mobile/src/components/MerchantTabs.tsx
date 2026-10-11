import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

export interface TabDef {
  key: string;
  icon: string;
  label: string;
}

export const MERCHANT_TABS: TabDef[] = [
  { key: "MerchantHome", icon: "🏠", label: "Início" },
  { key: "MerchantProducts", icon: "📦", label: "Produtos" },
  { key: "MerchantOrders", icon: "🛒", label: "Pedidos" },
  { key: "MerchantSales", icon: "💰", label: "Vendas" },
  { key: "StoreProfile", icon: "👤", label: "Perfil" },
];

export const ARTISAN_TABS: TabDef[] = [
  { key: "ArtisanHome", icon: "🏠", label: "Início" },
  { key: "ArtisanProducts", icon: "🧺", label: "Artesanatos" },
  { key: "ArtisanSell", icon: "🛍️", label: "Vender" },
  { key: "ArtisanOrders", icon: "📦", label: "Pedidos" },
  { key: "ArtisanProfile", icon: "👤", label: "Perfil" },
];

export function RoleTabs({ active, tabs }: { active: string; tabs: TabDef[] }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: 6 + insets.bottom }]}>
      {tabs.map((tab) => {
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

export default function MerchantTabs({ active }: { active: string }) {
  return <RoleTabs active={active} tabs={MERCHANT_TABS} />;
}

function Layout({ active, tabs, children }: { active: string; tabs: TabDef[]; children: React.ReactNode }) {
  return (
    <View style={s.layout}>
      <View style={s.content}>{children}</View>
      <RoleTabs active={active} tabs={tabs} />
    </View>
  );
}

// As telas de vendas funcionam para Comerciante e Artesão: a barra muda conforme o perfil
export function MerchantLayout({ active, children }: { active: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const tabs = user?.role === "ARTESAO" ? ARTISAN_TABS : MERCHANT_TABS;
  return (
    <Layout active={active} tabs={tabs}>
      {children}
    </Layout>
  );
}

export function ArtisanLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <Layout active={active} tabs={ARTISAN_TABS}>
      {children}
    </Layout>
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
