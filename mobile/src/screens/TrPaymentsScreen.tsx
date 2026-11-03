import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listTrPayments, confirmTrPayout, contestTrPayout } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { METHOD_ICON, PAYOUT_COLOR, PAYOUT_ICON } from "../constants/transporterMoney";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

type Mode = "confirm" | "contest";

const EMPTY_SUMMARY = {
  pending: { amount: 0, net: 0, count: 0 },
  received: { amount: 0, net: 0, count: 0 },
  contested: { amount: 0, net: 0, count: 0 },
  overdue: 0,
};

// Pagamentos recebidos e por receber, com confirmação e reclamação
export default function TrPaymentsScreen({ navigation, route }: any) {
  const catalog = useTrCatalog();

  const [status, setStatus] = useState<string>(route?.params?.status ?? "");
  const [range, setRange] = useState({ from: "", to: "" });

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [openId, setOpenId] = useState("");
  const [mode, setMode] = useState<Mode>("confirm");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (route?.params?.status !== undefined) setStatus(route.params.status ?? "");
  }, [route?.params?.status]);

  const key = JSON.stringify({ status, range });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listTrPayments({ status, from: range.from, to: range.to, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
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

  function openPanel(id: string, next: Mode) {
    if (openId === id && mode === next) {
      setOpenId("");
      return;
    }
    setOpenId(id);
    setMode(next);
    setMethod("");
    setReference("");
    setNote("");
  }

  async function submit(p: any) {
    if (mode === "confirm") {
      if (!method) return Alert.alert("Atenção", "Escolha como recebeu o pagamento.");
    } else if (note.trim().length < 10) {
      return Alert.alert("Atenção", "Explique o que se passou (pelo menos 10 letras). A equipa vai analisar.");
    }

    setSaving(true);
    try {
      if (mode === "confirm") await confirmTrPayout(p.id, { method, reference: reference.trim() || undefined, note: note.trim() || undefined });
      else await contestTrPayout(p.id, note.trim());

      setOpenId("");
      load(true);
      if (mode === "contest") Alert.alert("Reclamação enviada", "A equipa vai analisar e responde-lhe por notificação.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setSaving(false);
    }
  }

  const counts: Record<string, number> = { PENDENTE: summary.pending.count, RECEBIDO: summary.received.count, CONTESTADO: summary.contested.count };

  return (
    <TrLayout active="TrEarnings">
      <Page>
        <Title>💳 Pagamentos</Title>
        <Text style={u.muted}>O valor do transporte de cada entrega concluída. Quem paga é combinado com o comprador ou o vendedor: quando receber, confirme aqui.</Text>

        <View style={u.grid}>
          {(
            [
              ["⏳ Por receber", `${money(summary.pending.net)} · ${summary.pending.count}`, false],
              ["🚨 Há +3 dias", formatNumber(summary.overdue), summary.overdue > 0],
              ["✅ Recebido", `${money(summary.received.net)} · ${summary.received.count}`, false],
            ] as [string, string, boolean][]
          ).map(([label, value, warn]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 14, color: warn ? "#C62828" : undefined }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          <Chip label="Todos" active={status === ""} onPress={() => setStatus("")} />
          {catalog.payoutStatus.map((s) => (
            <Chip key={s.value} label={`${PAYOUT_ICON[s.value] ?? ""} ${s.label} (${counts[s.value] ?? 0})`.trim()} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </View>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} emptyLabel="Todos os períodos" />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} pagamento(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={status === "PENDENTE" ? "Não tem pagamentos por receber." : "Nenhum pagamento com estes filtros."} /> : null}

        {items.map((p) => (
          <Card key={p.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>{money(p.net)}</Text>
              <Badge label={labelOf(catalog.payoutStatus, p.status) || p.status} color={PAYOUT_COLOR[p.status] ?? "#757575"} />
            </View>
            <Text style={u.muted}>
              Entrega {p.orderCode} · {formatDate(p.createdAt)}
            </Text>
            <Text style={u.muted} numberOfLines={1}>
              {[p.pickup, p.destination].filter(Boolean).join(" → ")}
            </Text>
            {p.buyerName ? <Text style={u.muted}>🛒 {p.buyerName}</Text> : null}
            {p.commissionPercent > 0 ? (
              <Text style={u.muted}>
                Valor do transporte {money(p.amount)} − comissão de {p.commissionPercent}% ({money(p.commissionAmount)})
              </Text>
            ) : null}

            {p.status === "RECEBIDO" ? (
              <Text style={{ color: "#2E7D32", marginTop: 2 }}>
                {METHOD_ICON[p.method ?? "OUTRO"] ?? "💳"} {labelOf(catalog.paymentMethods, p.method) || "Recebido"}
                {p.reference ? ` · ref. ${p.reference}` : ""} {p.receivedAt ? `· ${formatDate(p.receivedAt)}` : ""}
              </Text>
            ) : null}
            {p.status === "PENDENTE" && p.ageDays >= 3 ? <Text style={{ color: "#C62828", marginTop: 2 }}>⏳ Por receber há {p.ageDays} dias</Text> : null}
            {p.note && p.status !== "RECEBIDO" ? <Text style={[u.muted, { marginTop: 2 }]}>📝 {p.note}</Text> : null}

            <View style={u.row}>
              <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TrDelivery", { id: p.deliveryId })} />
              {p.status === "PENDENTE" ? <Btn small label="✅ Já recebi" onPress={() => openPanel(p.id, "confirm")} /> : null}
              {p.status === "PENDENTE" ? <Btn small kind="danger" label="Não recebi" onPress={() => openPanel(p.id, "contest")} /> : null}
            </View>

            {openId === p.id ? (
              <View style={{ marginTop: 8 }}>
                {mode === "confirm" ? (
                  <>
                    <Text style={u.label}>Como recebeu?</Text>
                    <View style={u.row}>
                      {catalog.paymentMethods.map((m) => (
                        <Chip key={m.value} label={`${METHOD_ICON[m.value] ?? ""} ${m.label}`.trim()} active={method === m.value} onPress={() => setMethod(m.value)} />
                      ))}
                    </View>
                    <Field label="Referência (opcional)" value={reference} onChangeText={setReference} placeholder="Ex: número da transferência" />
                    <Field label="Nota (opcional)" value={note} onChangeText={setNote} />
                  </>
                ) : (
                  <>
                    <Text style={u.muted}>Explique quem devia pagar, o que combinou e o que aconteceu. A equipa analisa e responde-lhe.</Text>
                    <Field label="O que se passou" value={note} onChangeText={setNote} multiline placeholder="Ex: O comprador disse que pagava na entrega e não pagou." />
                  </>
                )}
                <Btn kind={mode === "contest" ? "danger" : "primary"} label={saving ? "A guardar..." : mode === "confirm" ? "Confirmar que recebi" : "Enviar a reclamação"} onPress={() => submit(p)} disabled={saving} />
              </View>
            ) : null}
          </Card>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </TrLayout>
  );
}
