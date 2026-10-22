import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GovLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listReports } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { REPORT_ICON, REPORT_STATUS_COLOR } from "../constants/gov";
import { formatDate } from "../constants/market";

const EMPTY = {
  counts: { newMine: 0, open: 0, urgent: 0, byStatus: {} as Record<string, number> },
  items: [] as any[],
};

// Pedidos e denúncias dos cidadãos, para as instituições públicas
export default function GovReportsScreen({ navigation }: any) {
  const catalog = useGovCatalog();
  const [scope, setScope] = useState<"mine" | "open">("mine");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(
    () => listReports({ scope, status: scope === "mine" ? status : "", category, priority: urgent ? "URGENTE" : "", q }),
    EMPTY,
    [scope, status, category, urgent, q]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const byStatus: Record<string, number> = d.counts.byStatus;
  const totalMine = Object.values(byStatus).reduce((s, n) => s + n, 0);

  return (
    <GovLayout active="GovHome">
      <Page loader={loader}>
        <Title>📝 Pedidos e denúncias</Title>
        <Text style={u.muted}>Pedidos de apoio, problemas agrícolas e de pesca, infraestruturas danificadas, problemas de mercado, denúncias e sugestões.</Text>

        <View style={u.grid}>
          {(
            [
              ["🆕 Novos para mim", d.counts.newMine],
              ["🌐 Abertos a todas", d.counts.open],
              ["🚨 Urgentes", d.counts.urgent],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          <Chip label="Para a minha instituição" active={scope === "mine"} onPress={() => setScope("mine")} />
          <Chip label={`Abertos a todas (${d.counts.open})`} active={scope === "open"} onPress={() => setScope("open")} />
        </View>

        <Field
          placeholder="Procurar por título ou protocolo"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {scope === "mine" ? (
          <ChipGroup
            label="Estado"
            options={catalog.reportStatus.map((s) => ({ value: s.value, label: `${s.label} (${byStatus[s.value] ?? 0})` }))}
            value={status}
            onChange={setStatus}
            allowEmpty
            emptyLabel={`Todos (${totalMine})`}
            scroll
          />
        ) : (
          <Text style={[u.muted, { marginTop: 8 }]}>
            Pedidos que os cidadãos deixaram abertos a todas as instituições. Ao assumir um, passa a ser seu e a pessoa é avisada.
          </Text>
        )}

        <ChipGroup
          label="Tipo"
          options={catalog.reportCategories.map((c) => ({ ...c, icon: REPORT_ICON[c.value] }))}
          value={category}
          onChange={setCategory}
          allowEmpty
          scroll
        />
        <View style={u.row}>
          <Chip label="🚨 Só urgentes" active={urgent} onPress={() => setUrgent(!urgent)} />
        </View>

        {d.items.length === 0 && !loader.loading ? (
          <Empty text={scope === "mine" ? "Não há pedidos com estes filtros." : "Não há pedidos abertos a todas as instituições."} />
        ) : (
          d.items.map((r: any) => (
            <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => navigation.navigate("GovReport", { id: r.id })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {REPORT_ICON[r.category] ?? "📝"} {r.title}
                  </Text>
                  <Badge label={labelOf(catalog.reportStatus, r.status)} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
                </View>

                <Text style={u.muted}>{labelOf(catalog.reportCategories, r.category)}</Text>
                <Text style={u.muted}>
                  {r.protocol} · {formatDate(r.createdAt)}
                  {r.region ? ` · 📍 ${r.region}` : ""}
                </Text>
                <Text style={u.muted}>👤 {r.anonymous ? "Cidadão anónimo" : r.requesterName ?? "Cidadão"}</Text>

                <View style={[u.row, { marginTop: 6 }]}>
                  {r.priority === "URGENTE" ? <Badge label="Urgente" color="#C62828" /> : null}
                  {r.isOpenRequest ? (
                    <View style={{ marginLeft: r.priority === "URGENTE" ? 8 : 0 }}>
                      <Badge label="Aberto a todas" color="#1565C0" />
                    </View>
                  ) : null}
                  {r.imagesCount > 0 ? <Text style={[u.muted, { marginLeft: 8, alignSelf: "center" }]}>📸 {r.imagesCount}</Text> : null}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={u.row}>
          <Btn small kind="outline" label="🏗️ Locais danificados" onPress={() => navigation.navigate("GovPlaces")} />
          <Btn small kind="outline" label="📍 Mapa do território" onPress={() => navigation.navigate("GovMap")} />
        </View>
      </Page>
    </GovLayout>
  );
}
