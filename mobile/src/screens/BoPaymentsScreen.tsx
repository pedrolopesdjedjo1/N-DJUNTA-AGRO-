import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoPayments } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { PAY_STATE_COLOR } from "../constants/backofficeFinance";
import { STAGE_COLOR, humanize } from "../constants/agentOps";
import { ORDER_STAGE_LABEL } from "../constants/backofficeOrders";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDateTime } from "../constants/market";

const EMPTY_SUMMARY = { pending: 0, pendingValue: 0, pendingOver3Days: 0, confirmed: 0, confirmedValue: 0, failed: 0 };

const SORTS = [
  { value: "ANTIGOS", label: "Mais antigos" },
  { value: "VALOR", label: "Maior valor" },
];

// Pagamentos registados nas encomendas: dinheiro, dinheiro móvel e transferência
export default function BoPaymentsScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();

  const [state, setState] = useState<string>(route?.params?.state ?? "");
  const [method, setMethod] = useState("");
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [methods, setMethods] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.state !== undefined) setState(route.params.state ?? "");
  }, [route?.params?.state]);

  const key = JSON.stringify({ state, method, sort, q, range });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoPayments({ state, method, sort, q, from: range.from, to: range.to, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setMethods(r.methods);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os pagamentos."));
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

  const counts: Record<string, number> = { PENDENTE: summary.pending, CONFIRMADO: summary.confirmed, FALHADO: summary.failed };

  return (
    <AdminLayout active="BoFinance">
      <Page>
        <Title>💳 Pagamentos</Title>
        <Text style={u.muted}>Pagamentos que os compradores registaram nas encomendas, com a forma de pagamento e a referência. A confirmação faz-se na conta de quem recebe, o vendedor.</Text>

        <View style={u.grid}>
          {(
            [
              ["⏳ Por confirmar", `${formatNumber(summary.pending)} · ${money(summary.pendingValue)}`],
              ["🚨 Há mais de 3 dias", formatNumber(summary.pendingOver3Days)],
              ["✅ Confirmados", `${formatNumber(summary.confirmed)} · ${money(summary.confirmedValue)}`],
              ["⛔ Falhados ou devolvidos", formatNumber(summary.failed)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 14, color: label.includes("3 dias") && summary.pendingOver3Days > 0 ? "#C62828" : undefined }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          <Chip label="Todos" active={state === ""} onPress={() => setState("")} />
          {catalog.paymentStates.map((s) => (
            <Chip key={s.value} label={`${s.label} (${counts[s.value] ?? 0})`} active={state === s.value} onPress={() => setState(s.value)} />
          ))}
        </View>

        {methods.length > 0 ? (
          <ChipGroup
            label="Forma de pagamento"
            options={methods.map((m) => ({ value: m.method, label: `${humanize(m.method)} (${m.count})` }))}
            value={method}
            onChange={setMethod}
            allowEmpty
            scroll
          />
        ) : null}
        <ChipGroup label="Ordenar por" options={SORTS} value={sort} onChange={setSort} allowEmpty emptyLabel="Mais recentes" scroll />

        <Field
          placeholder="Procurar por número da encomenda ou referência"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />
        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} emptyLabel="Todos os períodos" />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} pagamento(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={state === "PENDENTE" ? "Não há pagamentos por confirmar." : "Nenhum pagamento com estes filtros."} /> : null}

        {items.map((p) => (
          <Card key={p.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>{p.amount !== null ? money(p.amount) : "Valor por indicar"}</Text>
              <Badge label={labelOf(catalog.paymentStates, p.state) || p.state} color={PAY_STATE_COLOR[p.state] ?? "#757575"} />
            </View>
            <Text style={u.muted}>
              {humanize(p.method)}
              {p.reference ? ` · ref. ${p.reference}` : ""}
              {p.status ? ` · ${humanize(p.status)}` : ""}
            </Text>
            <Text style={u.muted}>{formatDateTime(p.createdAt)}</Text>
            {p.state === "PENDENTE" && p.ageDays >= 3 ? <Text style={{ color: "#C62828", marginTop: 2 }}>⏳ Por confirmar há {p.ageDays} dias</Text> : null}

            <Text style={{ marginTop: 6 }}>
              Encomenda {p.orderCode}
              {p.order ? ` · ${money(p.order.total)} · ` : " · "}
              <Text style={{ color: p.order ? STAGE_COLOR[p.order.stage] ?? "#757575" : "#757575" }}>{p.order ? ORDER_STAGE_LABEL[p.order.stage] ?? p.order.stage : "—"}</Text>
            </Text>
            <Text style={u.muted} numberOfLines={1}>
              🛒 {p.buyer?.name ?? "Comprador"} → 🏪 {p.seller?.name ?? "Vendedor"}
            </Text>

            <View style={u.row}>
              <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("BoOrder", { id: p.orderId })} />
              {p.state === "PENDENTE" && p.buyer ? (
                <Btn small kind="outline" label="💬 Falar com o comprador" onPress={() => navigation.navigate("Chat", { userId: p.buyer.id, userName: p.buyer.name })} />
              ) : null}
              {p.state === "PENDENTE" && p.seller ? (
                <Btn small kind="outline" label="💬 Falar com o vendedor" onPress={() => navigation.navigate("Chat", { userId: p.seller.id, userName: p.seller.name })} />
              ) : null}
            </View>
          </Card>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
