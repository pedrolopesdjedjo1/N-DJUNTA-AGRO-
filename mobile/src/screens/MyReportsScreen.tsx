import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Empty, u } from "../components/ui";
import { listMyReports } from "../api/reports";
import { REPORT_CATEGORIES, REPORT_STATUS_TEXT, REPORT_TARGET_TEXT } from "../constants/transporterSocial";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

// As denúncias que a própria pessoa fez e o que a equipa decidiu
export default function MyReportsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await listMyReports();
      setItems(Array.isArray(r) ? r : r?.items ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível carregar as denúncias."));
    } finally {
      setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <Page>
      <Title>📋 As minhas denúncias</Title>

      {error ? <Empty text={error} /> : null}
      {busy && items.length === 0 ? <Text style={u.muted}>A carregar...</Text> : null}
      {!busy && !error && items.length === 0 ? <Empty text="Ainda não fez denúncias." /> : null}

      {items.map((r) => {
        const status = REPORT_STATUS_TEXT[r.status] ?? { label: r.status, color: "#757575" };
        const category = REPORT_CATEGORIES.find((c) => c.value === r.category);
        return (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {category?.icon ?? "📝"} {category?.label ?? r.category}
              </Text>
              <Badge label={status.label} color={status.color} />
            </View>
            <Text style={u.muted}>
              {REPORT_TARGET_TEXT[r.targetType] ? `Sobre ${REPORT_TARGET_TEXT[r.targetType]}` : ""}
              {r.createdAt ? ` · ${formatDateTime(r.createdAt)}` : ""}
            </Text>
            {r.description ? (
              <Text style={{ marginTop: 4 }} numberOfLines={3}>
                {r.description}
              </Text>
            ) : null}
            {r.decisionNote ? <Text style={{ marginTop: 4 }}>⚖️ {r.decisionNote}</Text> : null}
          </Card>
        );
      })}

      <Btn kind="outline" label="🚩 Nova denúncia" onPress={() => navigation.navigate("ReportCreate")} />
    </Page>
  );
}
