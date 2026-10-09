import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { MerchantLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, useLoader, u } from "../components/ui";
import { getDashboard } from "../api/merchant";
import { money } from "../constants/market";

const EMPTY = {
  published: 0,
  available: 0,
  newOrders: 0,
  inProgress: 0,
  earnings: 0,
  customers: 0,
  rating: { average: 0, count: 0 },
  alerts: { lowStock: [] as any[], unreadNotifications: 0 },
};

const MENU = [
  ["📦", "Meus produtos", "MerchantProducts"],
  ["➕", "Publicar produto", "AddProduct"],
  ["🔎", "Pesquisar e explorar", "Products"],
  ["🛒", "Pedidos", "MerchantOrders"],
  ["🚚", "Entregas", "MerchantDeliveries"],
  ["💰", "Vendas e ganhos", "MerchantSales"],
  ["👥", "Clientes", "MerchantCustomers"],
  ["⭐", "Avaliações", "Reviews"],
  ["📢", "Promoções", "MerchantPromotions"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["👤", "Perfil da loja", "StoreProfile"],
  ["✅", "Verificação", "Verification"],
  ["🆘", "Suporte", "Support"],
];

export default function MerchantHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const loader = useLoader(getDashboard, EMPTY);
  const d: any = loader.data;

  const tiles = [
    ["💰 Ganhos", money(d.earnings)],
    ["📦 Produtos publicados", String(d.published)],
    ["✅ Disponíveis", String(d.available)],
    ["🛒 Novos pedidos", String(d.newOrders)],
    ["🚚 Em andamento", String(d.inProgress)],
    ["👥 Clientes", String(d.customers)],
    ["⭐ Avaliações", `${Number(d.rating.average).toFixed(1)} (${d.rating.count})`],
    ["⚠️ Alertas", String(d.alerts.lowStock.length + d.alerts.unreadNotifications)],
  ];

  function open(route: string) {
    if (route === "Reviews") {
      navigation.navigate("Reviews", { userId: user?.id, userName: user?.name });
    } else {
      navigation.navigate(route);
    }
  }

  return (
    <MerchantLayout active="MerchantHome">
      <Page loader={loader}>
        <Title>🏠 Olá, {user?.name}</Title>

        <View style={u.grid}>
          {tiles.map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {d.alerts.lowStock.length > 0 && (
          <>
            <SubTitle>⚠️ Estoque baixo</SubTitle>
            {d.alerts.lowStock.map((p: any) => (
              <Card key={p.id}>
                <Text style={u.strong}>{p.title}</Text>
                <Text style={u.muted}>Restam {p.quantity}</Text>
              </Card>
            ))}
          </>
        )}

        <SubTitle>Menu</SubTitle>
        <View style={u.grid}>
          {MENU.map(([icon, label, route]) => (
            <TouchableOpacity key={route} style={u.tile} onPress={() => open(route)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Page>
    </MerchantLayout>
  );
}
