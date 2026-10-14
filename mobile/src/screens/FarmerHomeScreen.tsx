import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { FarmerLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, useLoader, u } from "../components/ui";
import { getFarmerDashboard } from "../api/farmer";
import { money, formatDate } from "../constants/market";

const EMPTY = {
  published: 0,
  available: 0,
  ordersReceived: 0,
  newOrders: 0,
  salesCount: 0,
  earningsToday: 0,
  earningsMonth: 0,
  production: { totals: [] as any[], recent: [] as any[] },
  alerts: { lowStock: [] as any[], staleOrders: 0, unreadNotifications: 0, weather: [] as any[] },
};

const MENU = [
  ["🌱", "Minha produção", "FarmerProduction"],
  ["🛒", "Vender produtos", "FarmerSell"],
  ["📦", "Pedidos", "FarmerOrders"],
  ["🚚", "Transporte", "FarmerTransport"],
  ["💰", "Vendas e ganhos", "MerchantSales"],
  ["📈", "Preços de mercado", "FarmerPrices"],
  ["🌦️", "Clima e alertas", "FarmerWeather"],
  ["🤝", "Cooperativas", "FarmerCooperatives"],
  ["🧑‍🌾", "Recursos agrícolas", "FarmerResources"],
  ["📚", "Aprender", "Learning"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["🆘", "Ajuda e emergência", "FarmerHelp"],
  ["👤", "Meu perfil", "FarmerProfile"],
  ["✅", "Verificação", "Verification"],
  ["🌐", "Idioma", "Language"],
  ["⚙️", "Configurações", "Settings"],
];

export default function FarmerHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const loader = useLoader(getFarmerDashboard, EMPTY);
  const d: any = loader.data;
  const a = d.alerts;

  const tiles = [
    ["🌱 Produtos publicados", String(d.published)],
    ["✅ Disponíveis para venda", String(d.available)],
    ["📦 Pedidos recebidos", String(d.ordersReceived)],
    ["🆕 Novos pedidos", String(d.newOrders)],
    ["🛍️ Vendas realizadas", String(d.salesCount)],
    ["💰 Ganhos do dia", money(d.earningsToday)],
    ["📅 Ganhos do mês", money(d.earningsMonth)],
  ];

  const hasAlerts =
    a.lowStock.length > 0 || a.staleOrders > 0 || a.unreadNotifications > 0 || a.weather.length > 0;

  return (
    <FarmerLayout active="FarmerHome">
      <Page loader={loader}>
        <Title>🌾 Olá, {user?.name}</Title>

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

        <SubTitle>🌱 Resumo da produção</SubTitle>
        {d.production.totals.length === 0 ? (
          <Text style={u.muted}>Ainda não cadastrou produção disponível.</Text>
        ) : (
          <Card>
            <Text style={u.strong}>Disponível agora</Text>
            {d.production.totals.map((t: any) => (
              <Text key={t.unit} style={{ marginTop: 2 }}>
                {t.quantity} {t.unit}
              </Text>
            ))}
            {d.production.recent.map((p: any) => (
              <Text key={p.id} style={[u.muted, { marginTop: 6 }]}>
                {p.title}: {p.quantity} {p.unit}
                {p.harvestDate ? ` · colhido em ${formatDate(`${p.harvestDate}T12:00:00`)}` : ""}
              </Text>
            ))}
          </Card>
        )}

        <SubTitle>⚠️ Alertas importantes</SubTitle>
        {!hasAlerts ? (
          <Text style={u.muted}>Tudo em dia. Nenhum alerta por agora.</Text>
        ) : (
          <>
            {a.weather.map((w: any) => (
              <Card key={w.id}>
                <Text style={u.strong}>🌦️ {w.title}</Text>
                {w.description ? <Text style={u.muted}>{w.description}</Text> : null}
              </Card>
            ))}
            {a.staleOrders > 0 && (
              <Card>
                <Text style={u.strong}>{a.staleOrders} pedido(s) novo(s) à espera há mais de 2 dias</Text>
                <Text style={u.muted}>Responda depressa para não perder a venda.</Text>
              </Card>
            )}
            {a.lowStock.map((p: any) => (
              <Card key={p.id}>
                <Text style={u.strong}>{p.title}</Text>
                <Text style={u.muted}>
                  Restam apenas {p.quantity} {p.unit}
                </Text>
              </Card>
            ))}
            {a.unreadNotifications > 0 && (
              <Card>
                <Text style={u.strong}>🔔 {a.unreadNotifications} notificação(ões) por ler</Text>
              </Card>
            )}
          </>
        )}

        <SubTitle>Menu</SubTitle>
        <View style={u.grid}>
          {MENU.map(([icon, label, route]) => (
            <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Page>
    </FarmerLayout>
  );
}
