import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoDisputes } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { DISPUTE_REASON_ICON, DISPUTE_STATUS_COLOR } from "../constants/backofficeOrders";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

export default function BoDisputesScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();

  const [status, setStatus] = useState<string>(route?.params?.status ?? "");
  const [assigned, setAssigned] = useState("");
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.status !== undefined) setStatus(route.params.status ?? "");
  }, [route?.params?.status]);

  const key = JSON.stringify({ status, assigned, reason, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoDisputes({ status, assigned, reason, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as disputas."));
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

  const open = (counts.ABERTA ?? 0) + (counts.EM_ANALISE ?? 0);

  return (
    <AdminLayout active="BoOrders">
      <Page>
        <Title>⚖️ Disputas</Title>
        <Text style={u.muted}>Problemas que compradores e vendedores abriram numa encomenda. As mais antigas aparecem primeiro.</Text>

        <View style={u.grid}>
          {(
            [
              ["⏳ Por assumir", counts.ABERTA ?? 0],
              ["🔍 Em análise", counts.EM_ANALISE ?? 0],
              ["✅ Resolvidas", counts.RESOLVIDA ?? 0],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          <Chip label={`Em aberto (${open})`} active={status === ""} onPress={() => setStatus("")} />
          <Chip label={`Por assumir (${counts.ABERTA ?? 0})`} active={status === "ABERTA"} onPress={() => setStatus("ABERTA")} />
          <Chip label={`Em análise (${counts.EM_ANALISE ?? 0})`} active={status === "EM_ANALISE"} onPress={() => setStatus("EM_ANALISE")} />
          <Chip label={`Resolvidas (${counts.RESOLVIDA ?? 0})`} active={status === "RESOLVIDA"} onPress={() => setStatus("RESOLVIDA")} />
          <Chip label="Todas" active={status === "ALL"} onPress={() => setStatus("ALL")} />
        </View>
        <View style={u.row}>
          <Chip label="🙋 As minhas" active={assigned === "me"} onPress={() => setAssigned(assigned === "me" ? "" : "me")} />
          <Chip label="Sem responsável" active={assigned === "none"} onPress={() => setAssigned(assigned === "none" ? "" : "none")} />
        </View>

        <Field
          placeholder="Procurar por número da encomenda ou no texto"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />
        <ChipGroup
          label="Problema"
          options={catalog.disputeReasons.map((r) => ({ ...r, icon: DISPUTE_REASON_ICON[r.value] }))}
          value={reason}
          onChange={setReason}
          allowEmpty
          scroll
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} disputa(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={status === "" ? "Não há disputas em aberto. Tudo em ordem." : "Nenhuma disputa com estes filtros."} /> : null}

        {items.map((x) => (
          <TouchableOpacity key={x.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoDispute", { id: x.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {DISPUTE_REASON_ICON[x.reason] ?? "📝"} {labelOf(catalog.disputeReasons, x.reason) || x.reason}
                </Text>
                <Badge label={labelOf(catalog.disputeStatus, x.status) || x.status} color={DISPUTE_STATUS_COLOR[x.status] ?? "#757575"} />
              </View>
              <Text style={{ marginTop: 4 }}>
                Encomenda {x.orderCode}
                {x.orderTotal !== null ? ` · ${money(x.orderTotal)}` : ""}
              </Text>
              <Text style={u.muted}>
                {x.openedBy.name}
                {x.against ? ` contra ${x.against.name}` : ""}
              </Text>
              <Text style={{ marginTop: 4 }} numberOfLines={2}>
                {x.description}
              </Text>
              <View style={[u.row, { marginTop: 6 }]}>
                {x.status !== "RESOLVIDA" && x.ageDays >= 3 ? <Badge label={`Há ${x.ageDays} dias`} color={x.ageDays >= 7 ? "#C62828" : "#EF6C00"} /> : null}
                {x.assignedTo ? (
                  <View style={{ marginLeft: x.status !== "RESOLVIDA" && x.ageDays >= 3 ? 8 : 0 }}>
                    <Badge label={`🙋 ${x.assignedTo.name}`} color="#00838F" />
                  </View>
                ) : null}
              </View>
              <Text style={[u.muted, { color: colors.textSecondary }]}>
                {x.status === "RESOLVIDA" ? `Decidida: ${labelOf(catalog.disputeDecisions, x.decision) || "—"}` : `Aberta em ${formatDate(x.createdAt)}`}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
