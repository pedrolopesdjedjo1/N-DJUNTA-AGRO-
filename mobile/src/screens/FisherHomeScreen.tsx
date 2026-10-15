import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { FisherLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Btn, useLoader, u } from "../components/ui";
import { getFisherDashboard } from "../api/fisher";
import { FRESHNESS, money, formatDateTime } from "../constants/market";

const EMPTY = {
  today: { catches: 0, quantity: 0, weightKg: 0 },
  week: { catches: 0, weightKg: 0 },
  published: 0,
  available: 0,
  ordersReceived: 0,
  newOrders: 0,
  salesCount: 0,
  earningsToday: 0,
  earningsMonth: 0,
  recentCatches: [] as any[],
  alerts: { lowStock: [] as any[], staleOrders: 0, unreadNotifications: 0, weather: [] as any[] },
};

const MENU = [
  ["🎣", "Minha pesca", "FisherCatches"],
  ["🐟", "Vender pescado", "FisherSell"],
  ["📦", "Pedidos", "FisherOrders"],
  ["🚚", "Transporte", "FisherTransport"],
  ["🌊", "Mar e pesca", "FisherSea"],
  ["📈", "Preços de mercado", "FisherPrices"],
  ["🧊", "Conservação do pescado", "FisherConservation"],
  ["🤝", "Cooperativas de pesca", "FisherCooperatives"],
  ["⚓", "Equipamentos", "FisherEquipment"],
  ["📚", "Aprender", "Learning"],
  ["🆘", "Emergência no mar", "FisherSos"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["💰", "Vendas e ganhos", "MerchantSales"],
  ["👤", "Meu perfil", "FisherProfile"],
  ["✅", "Verificação", "Verification"],
  ["🌐", "Idioma", "Language"],
  ["⚙️", "Configurações", "Settings"],
];

function kg(value: number) {
  return `${Math.round((Number(value) || 0) * 10) / 10} kg`;
}

export default function FisherHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const loader = useLoader(getFisherDashboard, EMPTY);
  const d: any = loader.data;
  const a = d.alerts;

  const tiles = [
    ["🎣 Pescas de hoje", String(d.today.catches)],
    ["⚖️ Capturado hoje", kg(d.today.weightKg)],
    ["🐟 Quantidade hoje", String(d.today.quantity)],
    ["📅 Peso na semana", kg(d.week.weightKg)],
    ["✅ Disponíveis para venda", String(d.available)],
    ["📦 Pedidos recebidos", String(d.ordersReceived)],
    ["🆕 Novos pedidos", String(d.newOrders)],
    ["🛍️ Vendas realizadas", String(d.salesCount)],
    ["💰 Ganhos do dia", money(d.earningsToday)],
    ["🗓️ Ganhos do mês", money(d.earningsMonth)],
  ];

  const hasAlerts =
    a.lowStock.length > 0 || a.staleOrders > 0 || a.unreadNotifications > 0 || a.weather.length > 0;

  return (
    <FisherLayout active="FisherHome">
      <Page loader={loader}>
        <Title>🎣 Olá, {user?.name}</Title>

        <Btn kind="danger" label="🆘 SOS: emergência no mar" onPress={() => navigation.navigate("FisherSos")} />

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

        <SubTitle>📋 Resumo da atividade</SubTitle>
        {d.recentCatches.length === 0 ? (
          <Text style={u.muted}>Ainda não registou nenhuma pesca.</Text>
        ) : (
          d.recentCatches.map((c: any) => {
            const state = FRESHNESS.find((f) => f.value === c.freshness)?.label ?? c.freshness;
            return (
              <Card key={c.id}>
                <Text style={u.strong}>{c.species}</Text>
                <Text style={u.muted}>
                  {c.quantity} {c.unit}
                  {c.weightKg ? ` · ${kg(c.weightKg)}` : ""} · {state}
                </Text>
                <Text style={u.muted}>
                  {formatDateTime(c.caughtAt)}
                  {c.location ? ` · 📍 ${c.location}` : ""}
                </Text>
              </Card>
            );
          })
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
                <Text style={u.strong}>{a.staleOrders} pedido(s) novo(s) à espera há mais de 1 dia</Text>
                <Text style={u.muted}>Peixe fresco não espera: responda depressa.</Text>
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
    </FisherLayout>
  );
}
