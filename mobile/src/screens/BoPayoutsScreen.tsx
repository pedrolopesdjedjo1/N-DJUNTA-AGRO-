import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoPayouts, resolveBoPayout } from "../api/backofficeTransport";
import { useBoTransportCatalog } from "../utils/boTransportCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { PAYOUT_COLOR } from "../constants/transporterMoney";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

const EMPTY_SUMMARY = {
  pending: { count: 0, amount: 0 },
  overdue: { count: 0, amount: 0 },
  received: { count: 0, amount: 0 },
  contested: { count: 0, amount: 0 },
};

export default function BoPayoutsScreen({ navigation, route }: any) {
  const catalog = useBoTransportCatalog();
  const canResolve = adminCan("finance.manage", "transport.manage");

  // Sem filtro, o servidor mostra os pagamentos reclamados
  const [status, setStatus] = useState<string>(route?.params?.status ?? "");
  const [transporterId, setTransporterId] = useState<string>(route?.params?.transporterId ?? "");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [openId, setOpenId] = useState("");
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (route?.params?.status !== undefined) setStatus(route.params.status ?? "");
    if (route?.params?.transporterId !== undefined) setTransporterId(route.params.transporterId ?? "");
  }, [route?.params?.status, route?.params?.transporterId]);

  const key = JSON.stringify({ status, transporterId });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoPayouts({ status, transporterId, page: nextPage });
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

  async function resolve(p: any) {
    if (!outcome) return Alert.alert("Atenção", "Escolha o resultado.");
    if (note.trim().length < 5) return Alert.alert("Atenção", "Explique o que foi apurado (pelo menos 5 letras). O transportador vê.");

    setSaving(true);
    try {
      await resolveBoPayout(p.id, { outcome, note: note.trim() });
      setOpenId("");
      setOutcome("");
      setNote("");
      load(true);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>💳 Pagamentos de transporte</Title>
        <Text style={u.muted}>O valor do transporte que cada transportador tem a receber. O app não movimenta dinheiro: o transportador confirma que recebeu, ou reclama. Aqui a equipa resolve as reclamações.</Text>

        <View style={u.grid}>
          {(
            [
              ["⚠️ Reclamados", `${summary.contested.count} · ${money(summary.contested.amount)}`],
              ["🚨 Atrasados (+3 dias)", `${summary.overdue.count} · ${money(summary.overdue.amount)}`],
              ["⏳ Por receber", `${summary.pending.count} · ${money(summary.pending.amount)}`],
              ["✅ Recebidos", `${summary.received.count} · ${money(summary.received.amount)}`],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 13 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {transporterId ? (
          <View style={u.row}>
            <Chip label="🚛 Só de um transportador ✕" active onPress={() => { setTransporterId(""); navigation.setParams({ transporterId: undefined }); }} />
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={`Reclamados (${summary.contested.count})`} active={status === ""} onPress={() => setStatus("")} />
          <Chip label={`Atrasados (${summary.overdue.count})`} active={status === "OVERDUE"} onPress={() => setStatus("OVERDUE")} />
          <Chip label={`Por receber (${summary.pending.count})`} active={status === "PENDENTE"} onPress={() => setStatus("PENDENTE")} />
          <Chip label={`Recebidos (${summary.received.count})`} active={status === "RECEBIDO"} onPress={() => setStatus("RECEBIDO")} />
        </ScrollView>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} pagamento(s)`}</Text>
        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={status === "" ? "Não há pagamentos reclamados." : "Nenhum pagamento nesta lista."} /> : null}

        {items.map((p) => (
          <Card key={p.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>{money(p.net)}</Text>
              <Badge label={labelOf(catalog.payoutStatus, p.status) || p.status} color={PAYOUT_COLOR[p.status] ?? "#757575"} />
            </View>
            <Text style={u.muted}>
              Entrega {p.orderCode} · {formatDate(p.createdAt)} · há {p.ageDays} dia(s)
            </Text>
            {p.commissionAmount > 0 ? <Text style={u.muted}>Transporte {money(p.amount)} − comissão {money(p.commissionAmount)}</Text> : null}
            {p.transporter ? <Text style={{ marginTop: 2 }}>🚛 {p.transporter.name}</Text> : null}
            {p.note ? <Text style={{ marginTop: 4 }}>📝 {p.note}</Text> : null}
            {p.status === "RECEBIDO" && p.receivedAt ? <Text style={{ color: "#2E7D32" }}>Recebido em {formatDate(p.receivedAt)}</Text> : null}

            <View style={u.row}>
              <Btn small kind="outline" label="📦 Entrega" onPress={() => navigation.navigate("BoDelivery", { id: p.deliveryId })} />
              <Btn small kind="outline" label="🧾 Encomenda" onPress={() => navigation.navigate("BoOrder", { id: p.orderId })} />
              {p.transporter?.phone ? <Btn small kind="outline" label="📞 Transportador" onPress={() => Linking.openURL(`tel:${p.transporter.phone}`)} /> : null}
              {p.transporter ? <Btn small kind="outline" label="💬" onPress={() => navigation.navigate("Chat", { userId: p.transporter.id, userName: p.transporter.name })} /> : null}
              {canResolve && p.status === "CONTESTADO" ? <Btn small label={openId === p.id ? "Fechar" : "⚖️ Resolver"} onPress={() => { setOpenId(openId === p.id ? "" : p.id); setOutcome(""); setNote(""); }} /> : null}
            </View>

            {openId === p.id ? (
              <View style={{ marginTop: 8 }}>
                <Text style={u.muted}>Fale com as duas partes antes de decidir. O transportador recebe a sua explicação como notificação.</Text>
                <View style={u.row}>
                  {catalog.payoutOutcomes.map((o) => (
                    <Chip key={o.value} label={o.label} active={outcome === o.value} onPress={() => setOutcome(o.value)} />
                  ))}
                </View>
                <Field label="O que foi apurado" value={note} onChangeText={setNote} multiline placeholder="Ex: O comprador confirmou que pagou em mão. Pagamento confirmado." />
                <Btn label={saving ? "A guardar..." : "Confirmar a decisão"} onPress={() => resolve(p)} disabled={saving} />
              </View>
            ) : null}
          </Card>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
