import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, u } from "../components/ui";
import { listBoIncidents } from "../api/backofficeTransport";
import { useBoTransportCatalog } from "../utils/boTransportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const KIND_ICON: Record<string, string> = { SOS: "🆘", ACIDENTE: "💥", AVARIA: "🔧", ASSISTENCIA: "🚨", OCORRENCIA: "📝" };
const STATUS_COLOR: Record<string, string> = { ABERTA: "#F9A825", EM_ATENDIMENTO: "#1565C0", RESOLVIDA: "#2E7D32" };

export default function BoIncidentsScreen({ navigation, route }: any) {
  const catalog = useBoTransportCatalog();
  const [status, setStatus] = useState<string>(route?.params?.status ?? "open");
  const [kind, setKind] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [openSos, setOpenSos] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.status) setStatus(route.params.status);
  }, [route?.params?.status]);

  const key = JSON.stringify({ status, kind });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoIncidents({ status, kind, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setOpenSos(r.openSos);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as ocorrências."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  const open = (counts.ABERTA ?? 0) + (counts.EM_ATENDIMENTO ?? 0);

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>🆘 Ocorrências e SOS</Title>
        <Text style={u.muted}>SOS, acidentes, avarias, pedidos de assistência e ocorrências dos transportadores. O SOS aparece sempre primeiro.</Text>

        {openSos > 0 ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold", fontSize: 16 }}>🚨 {openSos} SOS por atender</Text>
            <Text style={u.muted}>Ligue ao transportador o mais depressa possível.</Text>
          </Card>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={`Em aberto (${open})`} active={status === "open"} onPress={() => setStatus("open")} />
          {catalog.incidentStatus.map((s) => (
            <Chip key={s.value} label={`${s.label} (${counts[s.value] ?? 0})`} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
          <Chip label="Todas" active={status === "all"} onPress={() => setStatus("all")} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="Todos os tipos" active={kind === ""} onPress={() => setKind("")} />
          {catalog.incidentKinds.map((k) => (
            <Chip key={k.value} label={`${KIND_ICON[k.value] ?? ""} ${k.label}`.trim()} active={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </ScrollView>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} ocorrência(s)`}</Text>
        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={status === "open" ? "Não há ocorrências por tratar." : "Nenhuma ocorrência com estes filtros."} /> : null}

        {items.map((i) => (
          <TouchableOpacity key={i.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoIncident", { id: i.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8, color: i.kind === "SOS" && i.status !== "RESOLVIDA" ? "#C62828" : undefined }]}>
                  {KIND_ICON[i.kind] ?? "📝"} {i.kindLabel}
                </Text>
                <Badge label={labelOf(catalog.incidentStatus, i.status) || i.status} color={STATUS_COLOR[i.status] ?? "#757575"} />
              </View>
              <Text style={{ marginTop: 2 }}>
                {i.transporter?.name ?? "Transportador"}
                {i.transporter?.location ? ` · ${i.transporter.location}` : ""}
              </Text>
              {i.description ? <Text style={u.muted} numberOfLines={2}>{i.description}</Text> : null}
              <Text style={u.muted}>
                {formatDateTime(i.createdAt)}
                {i.status !== "RESOLVIDA" ? ` · há ${i.ageMinutes < 60 ? `${i.ageMinutes} min` : `${Math.floor(i.ageMinutes / 60)} h`}` : ""}
                {i.locationShared ? " · 📍 com localização" : ""}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
