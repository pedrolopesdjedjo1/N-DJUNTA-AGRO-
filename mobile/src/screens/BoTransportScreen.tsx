import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, useLoader, u } from "../components/ui";
import { getBoTransportOverview } from "../api/backoffice";
import { getBoTransportExtra } from "../api/backofficeTransport";
import { adminCan } from "../utils/adminSession";
import { TRANSPORT_MENU, hoursText } from "../constants/backofficeTransport";
import { formatNumber } from "../utils/format";
import { money } from "../constants/market";

const EMPTY = {
  transporters: { total: 0, available: 0, verified: 0, pending: 0, working: 0 },
  deliveries: { awaiting: 0, accepted: 0, inTransit: 0, delivered: 0, cancelled: 0, awaitingOver24h: 0, staleInTransit: 0 },
  last7Days: { delivered: 0, problems: 0, released: 0 },
  avgDeliveryHours: null as number | null,
};

const EXTRA_EMPTY = {
  incidents: { open: 0, sosOpen: 0 },
  servicePoints: { pending: 0 },
  payouts: { contested: 0, contestedValue: 0, overdue: 0, overdueValue: 0 },
};

export default function BoTransportScreen({ navigation }: any) {
  const loader = useLoader(getBoTransportOverview, EMPTY);
  const extra = useLoader(getBoTransportExtra, EXTRA_EMPTY);
  const d: any = loader.data;
  const e: any = extra.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      extra.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const t = d.transporters;
  const x = d.deliveries;

  const attention: { key: string; level: string; count: number; text: string; route: string; params?: Record<string, any>; perms: string[] }[] = [
    { key: "sos", level: "ALTA", count: e.incidents.sosOpen, text: `${e.incidents.sosOpen} SOS de transportadores por atender`, route: "BoIncidents", params: { status: "open" }, perms: ["transport.view"] },
    { key: "awaiting", level: "ALTA", count: x.awaitingOver24h, text: `${x.awaitingOver24h} entrega(s) sem transportador há mais de 24 horas`, route: "BoDeliveries", params: { phase: "DISPONIVEL" }, perms: ["transport.view"] },
    { key: "stale", level: "ALTA", count: x.staleInTransit, text: `${x.staleInTransit} entrega(s) em transporte sem localização há mais de 1 hora`, route: "BoDeliveries", params: { phase: "EM_TRANSPORTE" }, perms: ["transport.view"] },
    { key: "incidents", level: "MEDIA", count: e.incidents.open - e.incidents.sosOpen, text: `${e.incidents.open - e.incidents.sosOpen} ocorrência(s) de transportadores por tratar`, route: "BoIncidents", params: { status: "open" }, perms: ["transport.view"] },
    { key: "contested", level: "MEDIA", count: e.payouts.contested, text: `${e.payouts.contested} pagamento(s) de transporte reclamado(s) (${money(e.payouts.contestedValue)})`, route: "BoPayouts", perms: ["transport.view"] },
    { key: "pending", level: "MEDIA", count: t.pending, text: `${t.pending} transportador(es) à espera de verificação`, route: "BoTransportVerification", perms: ["transport.manage"] },
    { key: "points", level: "MEDIA", count: e.servicePoints.pending, text: `${e.servicePoints.pending} posto(s) ou oficina(s) sugerido(s) por analisar`, route: "BoServicePoints", params: { status: "PENDENTE" }, perms: ["transport.view"] },
    { key: "problems", level: "MEDIA", count: d.last7Days.problems, text: `${d.last7Days.problems} problema(s) de entrega comunicado(s) nos últimos 7 dias`, route: "BoDeliveryProblems", perms: ["transport.view"] },
    { key: "overdue", level: "INFO", count: e.payouts.overdue, text: `${e.payouts.overdue} pagamento(s) de transporte por receber há mais de 3 dias (${money(e.payouts.overdueValue)})`, route: "BoPayouts", params: { status: "OVERDUE" }, perms: ["transport.view"] },
  ].filter((a) => a.count > 0 && adminCan(...a.perms));

  const tiles: [string, string][] = [
    ["🚛 Transportadores", formatNumber(t.total)],
    ["🟢 Disponíveis", formatNumber(t.available)],
    ["✅ Verificados", formatNumber(t.verified)],
    ["🚚 A trabalhar agora", formatNumber(t.working)],
    ["🆕 À espera de transportador", formatNumber(x.awaiting)],
    ["📋 Aceites, por recolher", formatNumber(x.accepted)],
    ["🚚 Em transporte", formatNumber(x.inTransit)],
    ["🏁 Entregues", formatNumber(x.delivered)],
    ["⏱️ Tempo médio de entrega", hoursText(d.avgDeliveryHours)],
    ["✅ Entregues (7 dias)", formatNumber(d.last7Days.delivered)],
    ["↩️ Devolvidas (7 dias)", formatNumber(d.last7Days.released)],
    ["⚠️ Problemas (7 dias)", formatNumber(d.last7Days.problems)],
  ];

  return (
    <AdminLayout active="BoTransport">
      <Page loader={loader}>
        <Title>🚚 Transportes</Title>

        <SubTitle>⚠️ Precisa de atenção</SubTitle>
        {attention.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nada à espera da equipa.</Text>
        ) : (
          attention.map((a) => (
            <TouchableOpacity key={a.key} activeOpacity={0.85} onPress={() => navigation.navigate(a.route, a.params)}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.text}</Text>
                  <Badge label={a.level === "ALTA" ? "Urgente" : a.level === "MEDIA" ? "Atenção" : "Info"} color={a.level === "ALTA" ? "#C62828" : a.level === "MEDIA" ? "#EF6C00" : "#757575"} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <SubTitle>Resumo</SubTitle>
        <View style={u.grid}>
          {tiles.map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 16 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <SubTitle>Gestão</SubTitle>
        <View style={u.grid}>
          {TRANSPORT_MENU.filter(([, , , , perms]) => adminCan(...(perms ?? []))).map(([icon, label, route, params]) => (
            <TouchableOpacity key={`${route}-${label}`} style={u.tile} onPress={() => navigation.navigate(route, params)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Page>
    </AdminLayout>
  );
}
