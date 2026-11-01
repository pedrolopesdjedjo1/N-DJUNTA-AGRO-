import React, { useCallback, useState } from "react";
import { View, Text, Alert, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getBoAlerts, endBoAlert, endBoOfficialAlert } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { SEVERITY_BO_COLOR } from "../constants/backoffice";
import { BROADCAST_ICON, SEVERITY_ICON } from "../constants/backofficeComms";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const EMPTY = {
  summary: { active: 0, emergencies: 0, official: 0, byTeam: 0 },
  affectedRegions: [] as any[],
  items: [] as any[],
  note: "",
};

// Clima e alertas: meteorológicos, marítimos, agrícolas, de estrada e de emergência
export default function BoAlertsScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const canManage = adminCan("alerts.manage");

  const [status, setStatus] = useState("active");
  const [type, setType] = useState("");
  const [kind, setKind] = useState("");
  const [busyId, setBusyId] = useState("");

  const loader = useLoader(() => getBoAlerts({ status, type, kind }), EMPTY, [status, type, kind]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function end(a: any) {
    Alert.alert("Terminar o alerta", `"${a.title}" deixa de aparecer.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Terminar",
        onPress: async () => {
          setBusyId(a.id);
          try {
            if (a.source === "OFICIAL") await endBoOfficialAlert(a.id);
            else await endBoAlert(a.id, false);
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar o alerta."));
          } finally {
            setBusyId("");
          }
        },
      },
    ]);
  }

  const s = d.summary;

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <Title>🌦️ Clima e alertas</Title>
        <Text style={u.muted}>Os alertas ativos para as pessoas: os da equipa e os das instituições oficiais. Veja que regiões estão afetadas e quantas pessoas vivem lá.</Text>

        <View style={u.grid}>
          {(
            [
              ["🚨 Ativos", s.active],
              ["🔴 Emergências", s.emergencies],
              ["🏛️ Oficiais", s.official],
              ["🛡️ Da equipa", s.byTeam],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { color: label.includes("Emerg") && value > 0 ? "#C62828" : undefined }]}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          {canManage ? <Btn small label="➕ Criar um alerta" onPress={() => navigation.navigate("BoBroadcasts", { mode: "alert" })} /> : null}
          {canManage ? <Btn small kind="outline" label="🏛️ Criar alerta oficial" onPress={() => navigation.navigate("GovAlertForm")} /> : null}
          <Btn small kind="outline" label="🌦️ Clima" onPress={() => navigation.navigate("GovWeather")} />
        </View>

        <SubTitle>Regiões afetadas</SubTitle>
        {d.affectedRegions.length === 0 ? (
          <Text style={u.muted}>Nenhuma região com alertas ativos.</Text>
        ) : (
          d.affectedRegions.map((r: any) => (
            <Card key={r.key}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {SEVERITY_ICON[r.maxSeverity] ?? "⚠️"} {r.name}
                </Text>
                <Badge label={`${r.alerts} alerta(s)`} color={SEVERITY_BO_COLOR[r.maxSeverity] ?? "#EF6C00"} />
              </View>
              <Text style={u.muted}>👥 {formatNumber(r.people)} pessoa(s) na região</Text>
            </Card>
          ))
        )}

        <SubTitle>Alertas</SubTitle>
        <View style={u.row}>
          <Chip label="Ativos" active={status === "active"} onPress={() => setStatus("active")} />
          <Chip label="Terminados" active={status === "ended"} onPress={() => setStatus("ended")} />
          <Chip label="Todos (histórico)" active={status === ""} onPress={() => setStatus("")} />
        </View>
        <View style={u.row}>
          <Chip label="Da equipa e oficiais" active={type === ""} onPress={() => setType("")} />
          <Chip label="Só da equipa" active={type === "admin"} onPress={() => setType("admin")} />
          <Chip label="Só oficiais" active={type === "official"} onPress={() => setType("official")} />
        </View>
        <ChipGroup
          label="Tipo"
          options={catalog.alertKinds.map((v) => ({ value: v, label: labelOf(catalog.broadcastKinds, v) || v, icon: BROADCAST_ICON[v] }))}
          value={kind}
          onChange={setKind}
          allowEmpty
          scroll
        />

        {d.items.length === 0 && !loader.loading ? (
          <Empty text={status === "active" ? "Não há alertas ativos." : "Nenhum alerta com estes filtros."} />
        ) : (
          d.items.map((a: any) => (
            <Card key={`${a.source}-${a.id}`}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  {BROADCAST_ICON[a.kind] ?? "🚨"} {a.title}
                </Text>
                <Badge label={a.active ? "Ativo" : "Terminado"} color={a.active ? SEVERITY_BO_COLOR[a.severity] ?? "#EF6C00" : "#757575"} />
              </View>
              <Text style={u.muted}>
                {a.source === "OFICIAL" ? "🏛️ Oficial" : "🛡️ Da equipa"} · {labelOf(catalog.broadcastKinds, a.kind) || a.kind} · {a.severity}
              </Text>
              {a.message ? (
                <Text style={{ marginTop: 4, lineHeight: 19 }} numberOfLines={3}>
                  {a.message}
                </Text>
              ) : null}
              <Text style={u.muted}>Regiões: {a.regions.length === 0 ? "todas" : a.regions.join(", ")}</Text>
              {a.sentCount !== null ? <Text style={u.muted}>👥 {formatNumber(a.sentCount)} pessoa(s) avisadas</Text> : null}
              <Text style={u.muted}>
                {formatDateTime(a.startsAt)}
                {a.endsAt ? ` → ${formatDateTime(a.endsAt)}` : ""}
              </Text>
              <View style={u.row}>
                {a.source === "OFICIAL" ? <Btn small kind="outline" label="Abrir" onPress={() => navigation.navigate("GovAlert", { id: a.id })} /> : null}
                {a.active && canManage ? <Btn small kind="danger" label={busyId === a.id ? "..." : "Terminar"} onPress={() => end(a)} disabled={busyId === a.id} /> : null}
              </View>
            </Card>
          ))
        )}

        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
      </Page>
    </AdminLayout>
  );
}
