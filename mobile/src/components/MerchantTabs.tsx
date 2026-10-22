import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { getBadges } from "../api/shop";
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

export const FARMER_TABS: TabDef[] = [
  { key: "FarmerHome", icon: "🏠", label: "Início" },
  { key: "FarmerProduction", icon: "🌱", label: "Produção" },
  { key: "FarmerSell", icon: "🛒", label: "Vender" },
  { key: "FarmerOrders", icon: "📦", label: "Pedidos" },
  { key: "FarmerProfile", icon: "👤", label: "Perfil" },
];

export const FISHER_TABS: TabDef[] = [
  { key: "FisherHome", icon: "🏠", label: "Início" },
  { key: "FisherCatches", icon: "🎣", label: "Pesca" },
  { key: "FisherSell", icon: "🐟", label: "Vender" },
  { key: "FisherSea", icon: "🌊", label: "Mar" },
  { key: "FisherProfile", icon: "👤", label: "Perfil" },
];

export const CLIENT_TABS: TabDef[] = [
  { key: "ClientHome", icon: "🏠", label: "Início" },
  { key: "ClientExplore", icon: "🔎", label: "Explorar" },
  { key: "ClientCart", icon: "🛒", label: "Carrinho" },
  { key: "ClientOrders", icon: "📦", label: "Encomendas" },
  { key: "ClientProfile", icon: "👤", label: "Perfil" },
];

export const NGO_TABS: TabDef[] = [
  { key: "NgoHome", icon: "🏠", label: "Início" },
  { key: "NgoProjects", icon: "📋", label: "Projetos" },
  { key: "NgoCommunities", icon: "🤝", label: "Comunidades" },
  { key: "NgoOpportunities", icon: "📢", label: "Oportunidades" },
  { key: "NgoProfile", icon: "🏢", label: "Perfil" },
];

export const GOV_TABS: TabDef[] = [
  { key: "GovHome", icon: "🏠", label: "Início" },
  { key: "GovProjects", icon: "📋", label: "Projetos" },
  { key: "GovData", icon: "📊", label: "Dados" },
  { key: "GovCommunication", icon: "📢", label: "Comunicação" },
  { key: "GovProfile", icon: "🏛️", label: "Perfil" },
];

// As telas da ONG que também servem o Governo mostram a barra do Governo
const NGO_TO_GOV: Record<string, string> = {
  NgoHome: "GovHome",
  NgoProjects: "GovProjects",
  NgoCommunities: "GovProjects",
  NgoOpportunities: "GovCommunication",
  NgoProfile: "GovProfile",
};

export function RoleTabs({
  active,
  tabs,
  badges,
}: {
  active: string;
  tabs: TabDef[];
  badges?: Record<string, number>;
}) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingBottom: 6 + insets.bottom }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const count = badges?.[tab.key] ?? 0;
        return (
          <TouchableOpacity key={tab.key} style={s.tab} onPress={() => !isActive && navigation.navigate(tab.key)}>
            <View>
              <Text style={[s.icon, !isActive && s.dim]}>{tab.icon}</Text>
              {count > 0 ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{count > 99 ? "99+" : count}</Text>
                </View>
              ) : null}
            </View>
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

function Layout({
  active,
  tabs,
  badges,
  children,
}: {
  active: string;
  tabs: TabDef[];
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  return (
    <View style={s.layout}>
      <View style={s.content}>{children}</View>
      <RoleTabs active={active} tabs={tabs} badges={badges} />
    </View>
  );
}

// As telas de vendas funcionam para vários perfis: a barra muda conforme o perfil
export function MerchantLayout({ active, children }: { active: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const role = user?.role as string | undefined;
  const tabs =
    role === "ARTESAO"
      ? ARTISAN_TABS
      : role === "AGRICULTOR"
      ? FARMER_TABS
      : role === "PESCADOR"
      ? FISHER_TABS
      : MERCHANT_TABS;
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

export function FarmerLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <Layout active={active} tabs={FARMER_TABS}>
      {children}
    </Layout>
  );
}

export function FisherLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <Layout active={active} tabs={FISHER_TABS}>
      {children}
    </Layout>
  );
}

// Barra da ONG. Se quem abre é do Governo, mostra a barra do Governo.
export function NgoLayout({ active, children }: { active: string; children: React.ReactNode }) {
  const { user } = useAuth();

  if ((user?.role as string | undefined) === "GOVERNO") {
    return (
      <Layout active={NGO_TO_GOV[active] ?? active} tabs={GOV_TABS}>
        {children}
      </Layout>
    );
  }

  return (
    <Layout active={active} tabs={NGO_TABS}>
      {children}
    </Layout>
  );
}

export function GovLayout({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <Layout active={active} tabs={GOV_TABS}>
      {children}
    </Layout>
  );
}

// Barra do cliente, com o número de produtos no carrinho e de encomendas em curso
export function ClientLayout({ active, children }: { active: string; children: React.ReactNode }) {
  const [badges, setBadges] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getBadges()
        .then((b: any) => {
          if (alive) {
            setBadges({
              ClientCart: b.cart ?? 0,
              ClientOrders: b.currentOrders ?? 0,
              ClientProfile: b.unreadNotifications ?? 0,
            });
          }
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [])
  );

  return (
    <Layout active={active} tabs={CLIENT_TABS} badges={badges}>
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
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#C62828",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
});
