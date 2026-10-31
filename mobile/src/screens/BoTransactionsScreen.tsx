import React, { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoTransactions } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { PAY_STATE_COLOR, TRANSACTION_ICON } from "../constants/backofficeFinance";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";

// Pagamentos, reembolsos pagos e comissões pagas, num só histórico
export default function BoTransactionsScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [kind, setKind] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ in: 0, out: 0, balance: 0, count: 0 });
  const [period, setPeriod] = useState<{ from: any; to: any }>({ from: null, to: null });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const key = JSON.stringify({ kind, q, range });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoTransactions({ kind, q, from: range.from, to: range.to, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setPeriod({ from: r.from, to: r.to });
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as transações."));
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

  return (
    <AdminLayout active="BoFinance">
      <Page>
        <Title>🧾 Transações</Title>
        <Text style={u.muted}>O que entrou (pagamentos confirmados) e o que saiu (reembolsos e comissões pagos). São valores registados: o app não movimenta dinheiro.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />
        {period.from ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Período: {formatDate(period.from)} a {formatDate(period.to)}
          </Text>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["⬇️ Entrou", money(summary.in)],
              ["⬆️ Saiu", money(summary.out)],
              ["⚖️ Saldo", money(summary.balance)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          <Chip label="Todas" active={kind === ""} onPress={() => setKind("")} />
          {catalog.transactionKinds.map((k) => (
            <Chip key={k.value} label={`${TRANSACTION_ICON[k.value] ?? ""} ${k.label}`.trim()} active={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </View>

        <Field
          placeholder="Procurar por pessoa, encomenda ou referência"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} movimento(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nenhum movimento neste período." /> : null}

        {items.map((t) => (
          <TouchableOpacity key={t.id} activeOpacity={0.85} onPress={() => (t.orderId ? navigation.navigate("BoOrder", { id: t.orderId }) : undefined)}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  {TRANSACTION_ICON[t.kind] ?? "•"} {t.label}
                </Text>
                <Text style={{ fontWeight: "bold", fontSize: 16, color: t.sign < 0 ? "#C62828" : "#2E7D32" }}>
                  {t.sign < 0 ? "−" : "+"} {money(t.amount)}
                </Text>
              </View>
              {t.party ? <Text style={u.muted}>👤 {t.party}</Text> : null}
              {t.reference ? <Text style={u.muted}>Ref. {t.reference}</Text> : null}
              <View style={[u.between, { marginTop: 2 }]}>
                <Text style={u.muted}>{formatDateTime(t.at)}</Text>
                {t.kind === "PAGAMENTO" ? <Badge label={t.state === "CONFIRMADO" ? "Confirmado" : t.state === "PENDENTE" ? "Por confirmar" : "Falhado"} color={PAY_STATE_COLOR[t.state] ?? "#757575"} /> : null}
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
