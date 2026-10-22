import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getMyReports } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { REPORT_ICON, REPORT_STATUS_COLOR } from "../constants/gov";
import { formatDate } from "../constants/market";

const OPEN = ["RECEBIDO", "EM_ANALISE", "ENCAMINHADO"];

// Pedidos e denúncias que eu enviei. Serve para qualquer perfil.
export default function GovMyReportsScreen({ navigation }: any) {
  const catalog = useGovCatalog();
  const loader = useLoader(getMyReports, [] as any[]);
  const items: any[] = loader.data;

  const [tab, setTab] = useState<"open" | "closed">("open");
  const [protocol, setProtocol] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const open = items.filter((r) => OPEN.includes(r.status));
  const closed = items.filter((r) => !OPEN.includes(r.status));
  const shown = tab === "open" ? open : closed;

  function track() {
    const value = protocol.trim().toUpperCase();
    if (value.length < 6) {
      Alert.alert("Atenção", "Escreva o número de protocolo (ex: PRO-2026-ABC123).");
      return;
    }
    navigation.navigate("GovTrack", { protocol: value });
  }

  return (
    <Page loader={loader}>
      <Title>📝 Pedidos e denúncias</Title>
      <Text style={u.muted}>Envie um pedido, um problema, uma denúncia ou uma sugestão ao Governo e acompanhe o estado.</Text>

      <SubTitle>O que quer enviar?</SubTitle>
      <View style={u.grid}>
        {catalog.reportCategories.map((c) => (
          <TouchableOpacity key={c.value} style={u.tile} onPress={() => navigation.navigate("GovReportForm", { category: c.value })}>
            <View style={u.tileBox}>
              <Text style={{ fontSize: 22 }}>{REPORT_ICON[c.value] ?? "📝"}</Text>
              <Text style={[u.strong, { marginTop: 4 }]}>{c.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <SubTitle>Acompanhar pelo protocolo</SubTitle>
      <Card>
        <Field label="Número de protocolo" value={protocol} onChangeText={setProtocol} autoCapitalize="characters" placeholder="PRO-2026-ABC123" />
        <Btn small label="Consultar" onPress={track} />
      </Card>

      <SubTitle>Os meus pedidos</SubTitle>
      <View style={u.row}>
        <Chip label={`Em aberto (${open.length})`} active={tab === "open"} onPress={() => setTab("open")} />
        <Chip label={`Encerrados (${closed.length})`} active={tab === "closed"} onPress={() => setTab("closed")} />
      </View>

      {shown.length === 0 ? (
        <Empty text={tab === "open" ? "Não tem pedidos em aberto." : "Ainda não tem pedidos encerrados."} />
      ) : (
        shown.map((r) => (
          <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => navigation.navigate("GovMyReport", { id: r.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {REPORT_ICON[r.category] ?? "📝"} {r.title}
                </Text>
                <Badge label={labelOf(catalog.reportStatus, r.status)} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>{labelOf(catalog.reportCategories, r.category)}</Text>
              <Text style={u.muted}>
                {r.protocol} · enviado em {formatDate(r.createdAt)}
              </Text>
              <Text style={u.muted}>🏛️ {r.institution ?? "Aberto a todas as instituições"}</Text>
              {r.anonymous ? <Text style={u.muted}>🕶️ Enviado sem o seu nome</Text> : null}
              {r.answer ? (
                <Text style={{ marginTop: 4 }} numberOfLines={2}>
                  💬 {r.answer}
                </Text>
              ) : null}
            </Card>
          </TouchableOpacity>
        ))
      )}

      <Btn label="➕ Enviar um pedido ou denúncia" onPress={() => navigation.navigate("GovReportForm")} />
    </Page>
  );
}
