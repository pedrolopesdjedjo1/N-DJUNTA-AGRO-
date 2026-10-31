import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoRefunds, listBoRefundCandidates, createBoRefund } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { REFUND_COLOR, orderCodeOf } from "../constants/backofficeFinance";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

interface Draft {
  orderId: string;
  disputeId?: string;
  amount: string;
  reason: string;
}

export default function BoRefundsScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();
  const canManage = adminCan("finance.manage");

  const [tab, setTab] = useState<string>(route?.params?.tab ?? "PENDENTE");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [values, setValues] = useState<Record<string, number>>({});
  const [candidates, setCandidates] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  // Abrir já com o pedido preenchido (vem da encomenda ou da disputa)
  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    if (p.tab) setTab(p.tab);
    if (p.prefill?.orderId) {
      setDraft({
        orderId: String(p.prefill.orderId),
        disputeId: p.prefill.disputeId ? String(p.prefill.disputeId) : undefined,
        amount: p.prefill.amount ? String(p.prefill.amount) : "",
        reason: "",
      });
    }
  }, [route?.params]);

  async function loadCandidates() {
    try {
      setCandidates(await listBoRefundCandidates());
    } catch (e) {
      // a lista fica como está
    }
  }

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoRefunds({ status: tab === "ALL" || tab === "CANDIDATES" ? "" : tab, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setValues(r.values);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os reembolsos."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      loadCandidates();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])
  );

  async function create() {
    if (!draft) return;
    const amount = Number(draft.amount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Atenção", "Indique o valor a devolver.");
      return;
    }
    if (draft.reason.trim().length < 5) {
      Alert.alert("Atenção", "Explique o motivo (pelo menos 5 letras). O comprador não vê esta nota, mas fica no registo.");
      return;
    }

    setSaving(true);
    try {
      const r = await createBoRefund({ orderId: draft.orderId, disputeId: draft.disputeId, amount, reason: draft.reason.trim() });
      setDraft(null);
      navigation.setParams({ prefill: undefined });
      navigation.navigate("BoRefund", { id: r.refund.id });
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível criar o pedido de reembolso."));
    } finally {
      setSaving(false);
    }
  }

  const tabs: [string, string][] = [
    ["PENDENTE", `Por decidir (${counts.PENDENTE ?? 0})`],
    ["APROVADO", `Por pagar (${counts.APROVADO ?? 0})`],
    ["PAGO", `Pagos (${counts.PAGO ?? 0})`],
    ["RECUSADO", `Recusados (${counts.RECUSADO ?? 0})`],
    ["CANDIDATES", `Por criar (${candidates.length})`],
    ["ALL", "Todos"],
  ];

  return (
    <AdminLayout active="BoFinance">
      <Page>
        <Title>↩️ Reembolsos</Title>
        <Text style={u.muted}>
          Devoluções de dinheiro a compradores. Fluxo: pedido, decisão, pagamento registado. Quem cria o pedido não o decide, e o total devolvido nunca passa o valor da encomenda.
        </Text>

        <View style={u.grid}>
          {(
            [
              ["⏳ Por decidir", `${formatNumber(counts.PENDENTE ?? 0)} · ${money(values.PENDENTE ?? 0)}`],
              ["💸 Por pagar", `${formatNumber(counts.APROVADO ?? 0)} · ${money(values.APROVADO ?? 0)}`],
              ["✅ Pagos", `${formatNumber(counts.PAGO ?? 0)} · ${money(values.PAGO ?? 0)}`],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 14 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {draft ? (
          <Card>
            <Text style={u.strong}>➕ Novo pedido de reembolso</Text>
            <Text style={u.muted}>
              Encomenda {orderCodeOf(draft.orderId)}
              {draft.disputeId ? " · de uma disputa decidida" : ""}
            </Text>
            <Field label="Valor a devolver (FCFA)" value={draft.amount} onChangeText={(v) => setDraft({ ...draft, amount: v.replace(/[^\d.,]/g, "") })} keyboardType="numeric" placeholder="Ex: 15000" />
            <Field label="Motivo" value={draft.reason} onChangeText={(v) => setDraft({ ...draft, reason: v })} multiline placeholder="Ex: Produto não entregue, conforme a decisão da disputa." />
            <View style={u.row}>
              <Btn label={saving ? "A criar..." : "Criar pedido"} onPress={create} disabled={saving} />
              <Btn kind="outline" label="Cancelar" onPress={() => { setDraft(null); navigation.setParams({ prefill: undefined }); }} />
            </View>
          </Card>
        ) : canManage ? (
          <Text style={u.muted}>Para criar um reembolso, abra a encomenda ou a disputa e toque em "Criar reembolso", ou use a lista "Por criar".</Text>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(([value, label]) => (
            <Chip key={value} label={label} active={tab === value} onPress={() => setTab(value)} />
          ))}
        </ScrollView>

        {tab === "CANDIDATES" ? (
          <>
            <SubTitle>Disputas decididas com devolução, sem pedido</SubTitle>
            {candidates.length === 0 ? (
              <Empty text="Não há devoluções por criar." />
            ) : (
              candidates.map((c) => (
                <Card key={c.disputeId}>
                  <Text style={u.strong}>
                    Encomenda {c.orderCode} · {money(c.amount)}
                  </Text>
                  {c.note ? <Text style={u.muted}>{c.note}</Text> : null}
                  <Text style={u.muted}>Decidida em {formatDate(c.decidedAt)}</Text>
                  <View style={u.row}>
                    {canManage ? (
                      <Btn small label="Criar o pedido" onPress={() => setDraft({ orderId: c.orderId, disputeId: c.disputeId, amount: String(c.amount), reason: c.note ?? "" })} />
                    ) : null}
                    <Btn small kind="outline" label="Ver a disputa" onPress={() => navigation.navigate("BoDispute", { id: c.disputeId })} />
                  </View>
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} reembolso(s)`}</Text>

            {error ? <Empty text={error} /> : null}
            {!busy && !error && items.length === 0 ? <Empty text={tab === "PENDENTE" ? "Não há reembolsos por decidir." : "Nenhum reembolso nesta lista."} /> : null}

            {items.map((r) => (
              <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoRefund", { id: r.id })}>
                <Card>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>{money(r.amount)}</Text>
                    <Badge label={labelOf(catalog.refundStatus, r.status) || r.status} color={REFUND_COLOR[r.status] ?? "#757575"} />
                  </View>
                  <Text style={u.muted}>
                    Encomenda {r.orderCode}
                    {r.orderTotal !== null ? ` (${money(r.orderTotal)})` : ""} · 🛒 {r.buyerName}
                  </Text>
                  <Text style={{ marginTop: 4 }} numberOfLines={2}>
                    {r.reason}
                  </Text>
                  <Text style={u.muted}>
                    Pedido por {r.requestedName} em {formatDate(r.createdAt)}
                  </Text>
                  {r.status === "PAGO" && r.paidAt ? <Text style={{ color: "#2E7D32" }}>Pago em {formatDate(r.paidAt)}</Text> : null}
                </Card>
              </TouchableOpacity>
            ))}

            {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
          </>
        )}
      </Page>
    </AdminLayout>
  );
}
