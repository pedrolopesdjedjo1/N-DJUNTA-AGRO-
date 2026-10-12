import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { ArtisanLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, useLoader, u } from "../components/ui";
import { getArtisanDashboard } from "../api/artisan";
import { money, formatDateTime } from "../constants/market";

const EMPTY = {
  published: 0,
  ordersReceived: 0,
  newOrders: 0,
  inProduction: 0,
  ready: 0,
  productsSold: 0,
  earningsToday: 0,
  earningsMonth: 0,
  rating: { average: 0, count: 0 },
  alerts: { lowStock: [] as any[], staleOrders: 0, unreadNotifications: 0, upcomingEvents: [] as any[] },
};

const MENU = [
  ["🧺", "Meus artesanatos", "ArtisanProducts"],
  ["🛍️", "Vender", "ArtisanSell"],
  ["📦", "Pedidos", "ArtisanOrders"],
  ["🚚", "Entrega", "MerchantDeliveries"],
  ["💰", "Vendas e ganhos", "MerchantSales"],
  ["🛒", "Materiais e fornecedores", "ArtisanMaterials"],
  ["📈", "Mercado", "ArtisanMarket"],
  ["🎪", "Feiras e eventos", "Events"],
  ["🤝", "Cooperativas e comunidades", "ArtisanCommunity"],
  ["📚", "Aprender", "Learning"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["⭐", "Avaliações", "ArtisanReviews"],
  ["👤", "Meu perfil", "ArtisanProfile"],
  ["✅", "Verificação", "Verification"],
  ["🆘", "Ajuda e suporte", "Help"],
  ["🌐", "Idioma", "Language"],
  ["⚙️", "Configurações", "Settings"],
];

export default function ArtisanHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const loader = useLoader(getArtisanDashboard, EMPTY);
  const d: any = loader.data;

  const tiles = [
    ["📦 Pedidos recebidos", String(d.ordersReceived)],
    ["🧺 Produtos publicados", String(d.published)],
    ["🛍️ Produtos vendidos", String(d.productsSold)],
    ["💰 Ganhos do dia", money(d.earningsToday)],
    ["📅 Ganhos do mês", money(d.earningsMonth)],
    ["⭐ Avaliação", `${Number(d.rating.average).toFixed(1)} (${d.rating.count})`],
    ["🆕 Novos pedidos", String(d.newOrders)],
    ["🧵 Em produção", String(d.inProduction)],
    ["✅ Prontos", String(d.ready)],
  ];

  const a = d.alerts;
  const hasAlerts =
    a.lowStock.length > 0 || a.staleOrders > 0 || a.unreadNotifications > 0 || a.upcomingEvents.length > 0;

  function open(route: string) {
    if (route === "ArtisanReviews") {
      navigation.navigate("ArtisanReviews");
    } else {
      navigation.navigate(route);
    }
  }

  return (
    <ArtisanLayout active="ArtisanHome">
      <Page loader={loader}>
        <Title>🧺 Olá, {user?.name}</Title>

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

        <SubTitle>⚠️ Alertas importantes</SubTitle>
        {!hasAlerts ? (
          <Text style={u.muted}>Tudo em dia. Nenhum alerta por agora.</Text>
        ) : (
          <>
            {a.staleOrders > 0 && (
              <Card>
                <Text style={u.strong}>{a.staleOrders} pedido(s) novo(s) à espera há mais de 2 dias</Text>
                <Text style={u.muted}>Responda depressa para não perder a venda.</Text>
              </Card>
            )}
            {a.lowStock.map((p: any) => (
              <Card key={p.id}>
                <Text style={u.strong}>{p.title}</Text>
                <Text style={u.muted}>Restam apenas {p.quantity}</Text>
              </Card>
            ))}
            {a.unreadNotifications > 0 && (
              <Card>
                <Text style={u.strong}>🔔 {a.unreadNotifications} notificação(ões) por ler</Text>
              </Card>
            )}
            {a.upcomingEvents.map((e: any) => (
              <Card key={e.id}>
                <Text style={u.strong}>🎪 {e.title}</Text>
                <Text style={u.muted}>
                  {formatDateTime(e.startsAt)} · {e.location}
                </Text>
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
    </ArtisanLayout>
  );
}
