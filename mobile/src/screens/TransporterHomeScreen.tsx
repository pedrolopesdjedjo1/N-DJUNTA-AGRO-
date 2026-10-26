import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Image, Switch, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { TransporterLayout } from "../components/TransporterTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, useLoader, u } from "../components/ui";
import DeliveryCard from "../components/transporter/DeliveryCard";
import { getTransporterHome, setTransporterAvailability } from "../api/transporter";
import { useTransportCatalog } from "../utils/transportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { ALERT_COLOR } from "../constants/ngo";
import { VEHICLE_ICON, stars } from "../constants/transporter";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const ZERO = { amount: 0, count: 0 };

const EMPTY = {
  transporter: {
    name: "",
    photoUrl: null as string | null,
    isVerified: false,
    isAvailable: true,
    vehicleType: null as string | null,
    plate: null as string | null,
    capacityKg: null as number | null,
    regions: [] as string[],
    rating: { average: null as number | null, count: 0 },
  },
  summary: { available: 0, availableAll: 0, inProgress: 0, upcoming: 0, completed: 0, completedToday: 0, completedMonth: 0 },
  availablePreview: [] as any[],
  inProgress: [] as any[],
  upcoming: [] as any[],
  recentCompleted: [] as any[],
  earnings: { today: ZERO, week: ZERO, month: ZERO },
  ratings: { average: null as number | null, count: 0, recent: [] as any[] },
  alerts: [] as any[],
  unreadNotifications: 0,
};

type MenuItem = [string, string, string, Record<string, any>?];

const MENU: MenuItem[] = [
  ["📦", "Entregas disponíveis", "TransporterDeliveries", { tab: "available" }],
  ["🚚", "As minhas entregas", "TransporterDeliveries", { tab: "inProgress" }],
  ["💰", "Ganhos", "TransporterEarnings"],
  ["⭐", "Avaliações", "TransporterRatings"],
  ["🗺️", "Mapa", "TransporterMap"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["🚛", "Perfil e veículo", "TransporterProfile"],
  ["✅", "Verificação", "TransporterVerification"],
  ["📑", "Relatório", "TransporterReport"],
  ["🆘", "Suporte", "Support"],
  ["⚙️", "Configurações", "Settings"],
];

function openTarget(navigation: any, target: { screen: string; id?: string }) {
  switch (target.screen) {
    case "delivery":
      return navigation.navigate("TransporterDelivery", { id: target.id });
    case "available":
      return navigation.navigate("TransporterDeliveries", { tab: "available" });
    case "profile":
      return navigation.navigate("TransporterProfile");
    case "alert":
      return navigation.navigate("GovAlert", { id: target.id });
    case "verification":
      return navigation.navigate("TransporterVerification");
    default:
      return undefined;
  }
}

export default function TransporterHomeScreen({ navigation }: any) {
  const catalog = useTransportCatalog();
  const loader = useLoader(getTransporterHome, EMPTY);
  const d: any = loader.data;
  const [switching, setSwitching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const t = d.transporter;
  const s = d.summary;

  async function toggleAvailable(value: boolean) {
    setSwitching(true);
    try {
      await setTransporterAvailability(value);
      loader.setData({ ...d, transporter: { ...t, isAvailable: value } });
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar a disponibilidade."));
    } finally {
      setSwitching(false);
    }
  }

  const tiles: [string, string, string, Record<string, any>?][] = [
    ["🆕 Novas disponíveis", formatNumber(s.available), "TransporterDeliveries", { tab: "available" }],
    ["🚚 Em andamento", formatNumber(s.inProgress), "TransporterDeliveries", { tab: "inProgress" }],
    ["📋 Próximas entregas", formatNumber(s.upcoming), "TransporterDeliveries", { tab: "upcoming" }],
    ["✅ Concluídas (mês)", `${formatNumber(s.completedMonth)} de ${formatNumber(s.completed)}`, "TransporterDeliveries", { tab: "completed" }],
    ["💰 Ganhos de hoje", money(d.earnings.today.amount), "TransporterEarnings"],
    ["⭐ Avaliação", t.rating.average ? `${t.rating.average} (${t.rating.count})` : "Sem avaliações", "TransporterRatings"],
  ];

  return (
    <TransporterLayout active="TransporterHome">
      <Page loader={loader}>
        <View style={[u.row, { alignItems: "center" }]}>
          {t.photoUrl ? (
            <Image source={{ uri: t.photoUrl }} style={[u.photo, { width: 56, height: 56, borderRadius: 28 }]} />
          ) : (
            <View style={[u.photo, { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 26 }}>{VEHICLE_ICON[t.vehicleType ?? "OUTRO"] ?? "🚚"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Title>{t.name || "Transportador"}</Title>
            <Text style={u.muted}>
              {t.vehicleType ? labelOf(catalog.vehicleTypes, t.vehicleType) : "Veículo por indicar"}
              {t.plate ? ` · ${t.plate}` : ""}
            </Text>
          </View>
        </View>

        <View style={u.row}>
          {t.isVerified ? <Badge label="Verificado ✅" color="#2E7D32" /> : <Badge label="Por verificar" color="#757575" />}
          {d.unreadNotifications > 0 ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`🔔 ${d.unreadNotifications}`} color="#C62828" />
            </View>
          ) : null}
        </View>

        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>{t.isAvailable ? "🟢 Disponível para entregas" : "🔴 Indisponível"}</Text>
              <Text style={u.muted}>
                {t.isAvailable ? "Vê e pode aceitar entregas novas." : "Não aparece para aceitar entregas novas."}
                {t.regions.length > 0 ? ` Regiões: ${t.regions.join(", ")}.` : ""}
              </Text>
            </View>
            <Switch value={t.isAvailable} onValueChange={toggleAvailable} disabled={switching} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>
        </Card>

        <View style={u.row}>
          <Btn small label={`📦 Ver entregas disponíveis (${s.available})`} onPress={() => navigation.navigate("TransporterDeliveries", { tab: "available" })} />
          <Btn small kind="outline" label="🗺️ Mapa" onPress={() => navigation.navigate("TransporterMap")} />
        </View>

        <View style={u.grid}>
          {tiles.map(([label, value, route, routeParams]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate(route, routeParams)}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <SubTitle>⚠️ Alertas importantes</SubTitle>
        {d.alerts.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nenhum alerta por agora.</Text>
        ) : (
          d.alerts.map((a: any) => (
            <TouchableOpacity key={a.key} activeOpacity={0.85} onPress={() => openTarget(navigation, a.target)}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.title}</Text>
                  <Badge label={a.level === "ALTA" ? "Urgente" : a.level === "MEDIA" ? "Atenção" : "Info"} color={ALERT_COLOR[a.level] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{a.detail}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {d.inProgress.length > 0 ? (
          <>
            <SubTitle>🚚 Entregas em andamento</SubTitle>
            {d.inProgress.map((c: any) => (
              <DeliveryCard key={c.id} item={c} phases={catalog.deliveryPhases} onPress={() => navigation.navigate("TransporterDelivery", { id: c.id })} />
            ))}
          </>
        ) : null}

        <SubTitle>🆕 Novas entregas disponíveis</SubTitle>
        {d.availablePreview.length === 0 ? (
          <Text style={u.muted}>
            {t.isAvailable ? "Não há entregas novas nas suas regiões. Volte daqui a pouco." : "Está indisponível: ligue a disponibilidade para ver entregas."}
          </Text>
        ) : (
          d.availablePreview.map((c: any) => (
            <DeliveryCard key={c.id} item={c} phases={catalog.deliveryPhases} onPress={() => navigation.navigate("TransporterDelivery", { id: c.id })} />
          ))
        )}
        <Btn small kind="outline" label="Ver todas as entregas disponíveis" onPress={() => navigation.navigate("TransporterDeliveries", { tab: "available" })} />

        {d.upcoming.length > 0 ? (
          <>
            <SubTitle>📋 Próximas entregas</SubTitle>
            {d.upcoming.map((c: any) => (
              <DeliveryCard key={c.id} item={c} phases={catalog.deliveryPhases} onPress={() => navigation.navigate("TransporterDelivery", { id: c.id })} />
            ))}
          </>
        ) : null}

        {d.recentCompleted.length > 0 ? (
          <>
            <SubTitle>✅ Concluídas recentemente</SubTitle>
            {d.recentCompleted.map((c: any) => (
              <DeliveryCard key={c.id} item={c} phases={catalog.deliveryPhases} onPress={() => navigation.navigate("TransporterDelivery", { id: c.id })} />
            ))}
          </>
        ) : null}

        <SubTitle>💰 Ganhos</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["Hoje", d.earnings.today],
              ["Esta semana", d.earnings.week],
              ["Este mês", d.earnings.month],
            ] as [string, any][]
          ).map(([label, r]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{money(r.amount)}</Text>
                <Text style={u.tileLabel}>
                  {label} · {r.count} entrega(s)
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Btn small kind="outline" label="Ver ganhos em detalhe" onPress={() => navigation.navigate("TransporterEarnings")} />

        <SubTitle>⭐ Avaliações recebidas</SubTitle>
        {d.ratings.count === 0 ? (
          <Text style={u.muted}>Ainda não recebeu avaliações. Elas aparecem depois das primeiras entregas.</Text>
        ) : (
          <>
            <Text style={u.strong}>
              {d.ratings.average} de 5 · {d.ratings.count} avaliação(ões)
            </Text>
            {d.ratings.recent.map((r: any) => (
              <Card key={r.id}>
                <Text>{stars(r.rating)}</Text>
                {r.comment ? <Text style={{ marginTop: 2 }}>{r.comment}</Text> : null}
                <Text style={u.muted}>
                  {r.authorName} · {formatDate(r.createdAt)}
                </Text>
              </Card>
            ))}
          </>
        )}
        <Btn small kind="outline" label="Ver todas as avaliações" onPress={() => navigation.navigate("TransporterRatings")} />

        <SubTitle>Menu</SubTitle>
        <View style={u.grid}>
          {MENU.map(([icon, label, route, routeParams]) => (
            <TouchableOpacity key={`${route}-${label}`} style={u.tile} onPress={() => navigation.navigate(route, routeParams)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Page>
    </TransporterLayout>
  );
}
