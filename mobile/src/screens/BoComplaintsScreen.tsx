import React, { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, u } from "../components/ui";
import { listBoComplaints } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { REPORT_CATEGORY_ICON, REPORT_STATUS_COLOR, REPORT_TARGET_ICON } from "../constants/backofficeModeration";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

// Reclamações e denúncias sobre transportadores e entregas
export default function BoComplaintsScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [status, setStatus] = useState("OPEN");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoComplaints({ status: status === "ALL" ? "ALL" : "", page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as reclamações."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status])
  );

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>📣 Reclamações</Title>
        <Text style={u.muted}>Denúncias de entregas e de transportadores feitas por compradores e vendedores. Abra uma para a analisar e decidir.</Text>

        <View style={u.row}>
          <Chip label="Por analisar" active={status === "OPEN"} onPress={() => setStatus("OPEN")} />
          <Chip label="Todas" active={status === "ALL"} onPress={() => setStatus("ALL")} />
        </View>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} reclamação(ões)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Não há reclamações por analisar." /> : null}

        {items.map((r) => (
          <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoReport", { id: r.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {REPORT_CATEGORY_ICON[r.category] ?? "📝"} {labelOf(catalog.reportCategories, r.category) || r.category}
                </Text>
                <Badge label={labelOf(catalog.reportStatus, r.status) || r.status} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>
                {REPORT_TARGET_ICON[r.targetType] ?? ""} {labelOf(catalog.reportTargets, r.targetType)}
              </Text>
              <Text style={{ marginTop: 4, lineHeight: 20 }} numberOfLines={3}>
                {r.description}
              </Text>
              <Text style={u.muted}>
                De {r.reporter?.name ?? "—"}
                {r.reported ? ` → contra ${r.reported.name}` : ""} · {formatDateTime(r.createdAt)}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
