import React, { useCallback, useState } from "react";
import { View, Text, Image, Switch, Alert, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import TrDeliveryCard from "../components/transporter/TrDeliveryCard";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getTrHome, setTrAvailability } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { TR_BADGE, TR_VEHICLE_ICON, trStars } from "../constants/transporterV2";
import { ALERT_COLOR } from "../constants/ngo";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  transporter: { name: "", photoUrl: null as any, isVerified: false, isAvailable: false, vehicleType: null as any, vehicleStatus: "OPERACIONAL", vehicleReady: false, plate: null as any, capacityKg: null as any, regions: [] as string[], rating: { average: null as any, count: 0 }, badge: "NOVO" },
  summary: { available: 0, availableCompatible: 0, availableAll: 0, inProgress: 0, upcoming: 0, completed: 0, completedToday: 0, completedMonth: 0 },
  availablePreview: [] as any[],
  inProgress: [] as any[],
  upcoming: [] as any[],
  recentCompleted: [] as any[],
  earnings: {
    today: { amount: 0, net: 0, count: 0 },
    week: { amount: 0, net: 0, count: 0 },
    month: { amount: 0, net: 0, count: 0 },
    pending: { amount: 0, net: 0, count: 0 },
    profitMonth: 0,
  },
  ratings: { average: null as any, count: 0, recent: [] as any[], badge: "NOVO" },
  alerts: [] as any[],
  unreadNotifications: 0,
};

export default function TrHomeScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(getTrHome, EMPTY);
  const d: any = loader.data;
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const t = d.transporter;
  const s = d.summary;
  const badge = TR_BADGE[t.badge] ?? TR_BADGE.NOVO;

  async function toggleAvailability(value: boolean) {
    setBusy(true);
    try {
      await setTrAvailability(value);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar a disponibilidade."));
    } finally {
      setBusy(false);
    }
  }

  function openAlert(a: any) {
    const id = a.target?.id;
    switch (a.target?.screen) {
      case "delivery":
        return navigation.navigate("TrDelivery", { id });
      case "alert":
        return navigation.navigate("TrMap");
      case "vehicle":
        return navigation.navigate("TrVehicle");
      case "profile":
        return navigation.navigate("TrProfile");
      case "payments":
        return navigation.navigate("TrEarnings");
      case "requests":
        return navigation.navigate("TrLoads", { tab: "requests" });
      case "rate":
        return navigation.navigate("TrReputation");
      case "available":
        return navigation.navigate("TrDeliveries", { tab: "available" });
      case "verification":
        return navigation.navigate("TransporterVerification");
      default:
        return undefined;
    }
  }

  const tiles: [string, number, string, Record<string, any>][] = [
    ["🆕 Cargas para si", s.availableCompatible, "TrDeliveries", { tab: "available" }],
    ["📋 Por recolher", s.upcoming, "TrDeliveries", { tab: "upcoming" }],
    ["🚚 Em transporte", s.inProgress, "TrDeliveries", { tab: "inProgress" }],
    ["✅ Entregues hoje", s.completedToday, "TrDeliveries", { tab: "completed" }],
  ];

  return (
    <TrLayout active="TrHome">
      <Page loader={loader}>
        <View style={[u.row, { alignItems: "center" }]}>
          {t.photoUrl ? (
            <Image source={{ uri: t.photoUrl }} style={[u.photo, { width: 56, height: 56, borderRadius: 28 }]} />
          ) : (
            <View style={[u.photo, { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 26 }}>{TR_VEHICLE_ICON[t.vehicleType ?? "OUTRO"] ?? "🚚"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Title>Olá, {String(t.name).split(" ")[0] || "transportador"} {t.isVerified ? "✅" : ""}</Title>
            <Text style={u.muted}>
              {badge.icon} {labelOf(catalog.badges, t.badge) || "Transportador"}
              {t.rating.average ? ` · ${trStars(t.rating.average)} ${t.rating.average}` : ""}
            </Text>
          </View>
          {d.unreadNotifications > 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
              <Badge label={`🔔 ${d.unreadNotifications}`} color="#C62828" />
            </TouchableOpacity>
          ) : null}
        </View>

        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>{t.isAvailable ? "🟢 Disponível para entregas" : "🔴 Indisponível"}</Text>
              <Text style={u.muted}>
                {t.vehicleType ? `${labelOf(catalog.vehicleTypes, t.vehicleType)}${t.plate ? ` · ${t.plate}` : ""}${t.capacityKg ? ` · ${t.capacityKg} kg` : ""}` : "Veículo por registar"}
              </Text>
              {t.regions.length > 0 ? <Text style={u.muted}>🧭 {t.regions.join(", ")}</Text> : null}
            </View>
            <Switch value={t.isAvailable} onValueChange={toggleAvailability} disabled={busy || (!t.vehicleReady && !t.isAvailable)} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>
        </Card>

        <SubTitle>⚠️ Alertas importantes</SubTitle>
        {d.alerts.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nada à espera de si.</Text>
        ) : (
          d.alerts.map((a: any) => (
            <TouchableOpacity key={a.key} activeOpacity={0.85} onPress={() => openAlert(a)}>
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

        <SubTitle>Resumo das atividades</SubTitle>
        <View style={u.grid}>
          {tiles.map(([label, value, route, params]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate(route, params)}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <SubTitle>Ganhos</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["Hoje", d.earnings.today],
              ["Esta semana", d.earnings.week],
              ["Este mês", d.earnings.month],
            ] as [string, any][]
          ).map(([label, r]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate("TrEarnings")}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{money(r.net)}</Text>
                <Text style={u.tileLabel}>
                  {label} · {r.count} entrega(s)
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {d.earnings.pending.count > 0 ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("TrEarnings")}>
            <Text style={{ color: "#EF6C00", marginTop: 6 }}>
              ⏳ {money(d.earnings.pending.net)} por receber ({d.earnings.pending.count} entrega(s)). Toque para ver.
            </Text>
          </TouchableOpacity>
        ) : null}

        {d.inProgress.length > 0 ? (
          <>
            <SubTitle>🚚 Em andamento</SubTitle>
            {d.inProgress.map((c: any) => (
              <TrDeliveryCard key={c.id} item={c} catalog={catalog} onPress={() => navigation.navigate("TrDelivery", { id: c.id })} />
            ))}
          </>
        ) : null}

        <SubTitle>📋 Próximas entregas</SubTitle>
        {d.upcoming.length === 0 ? (
          <Text style={u.muted}>Não tem entregas por recolher.</Text>
        ) : (
          d.upcoming.map((c: any) => <TrDeliveryCard key={c.id} item={c} catalog={catalog} onPress={() => navigation.navigate("TrDelivery", { id: c.id })} />)
        )}

        <SubTitle>🆕 Cargas disponíveis para si</SubTitle>
        {d.availablePreview.length === 0 ? (
          <Empty text={t.vehicleReady ? "Não há cargas novas que sirvam ao seu veículo nas suas regiões." : "Ponha o veículo pronto para ver as cargas que lhe servem."} />
        ) : (
          d.availablePreview.map((c: any) => <TrDeliveryCard key={c.id} item={c} catalog={catalog} onPress={() => navigation.navigate("TrDelivery", { id: c.id })} />)
        )}
        <Btn kind="outline" label={`Ver todas as cargas (${s.availableAll})`} onPress={() => navigation.navigate("TrDeliveries", { tab: "available" })} />

        {d.recentCompleted.length > 0 ? (
          <>
            <SubTitle>✅ Concluídas recentemente</SubTitle>
            {d.recentCompleted.map((c: any) => (
              <TrDeliveryCard key={c.id} item={c} catalog={catalog} onPress={() => navigation.navigate("TrDelivery", { id: c.id })} />
            ))}
          </>
        ) : null}

        <SubTitle>⭐ Avaliações</SubTitle>
        <Card>
          {d.ratings.count === 0 ? (
            <Text style={u.muted}>Ainda não tem avaliações. Cada entrega bem feita ajuda a construir a sua reputação.</Text>
          ) : (
            <>
              <Text style={{ fontSize: 20 }}>
                {trStars(d.ratings.average)} <Text style={{ fontWeight: "bold" }}>{d.ratings.average}</Text> <Text style={u.muted}>({d.ratings.count})</Text>
              </Text>
              {d.ratings.recent.map((r: any) => (
                <Text key={r.id} style={{ marginTop: 4 }} numberOfLines={2}>
                  {trStars(r.rating)} {r.comment ? `"${r.comment}"` : ""} <Text style={u.muted}>{r.authorName} · {formatDate(r.createdAt)}</Text>
                </Text>
              ))}
            </>
          )}
          <Btn small kind="outline" label="Ver a minha reputação" onPress={() => navigation.navigate("TrReputation")} />
        </Card>

        <View style={u.row}>
          <Btn small kind="outline" label="🆘 Emergência" onPress={() => navigation.navigate("TrEmergency")} />
          <Btn small kind="outline" label="💬 Mensagens" onPress={() => navigation.navigate("Conversations")} />
          <Btn small kind="outline" label="🧰 Ferramentas" onPress={() => navigation.navigate("TrTools")} />
        </View>
      </Page>
    </TrLayout>
  );
}
