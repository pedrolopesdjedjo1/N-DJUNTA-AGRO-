import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, u } from "../components/ui";
import { listAgentPayments, getAgentClient } from "../api/agent";
import { STAGE_COLOR, humanize, shortId } from "../constants/agentOps";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDateTime } from "../constants/market";

const EMPTY_COUNTS = { pending: 0, confirmed: 0, total: 0, pendingValue: 0 };

// Pagamentos das encomendas dos clientes. O app não movimenta dinheiro: mostra o que foi registado.
export default function AgentPaymentsScreen({ navigation, route }: any) {
  const [linkId, setLinkId] = useState<string>(route?.params?.linkId ?? "");
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<"" | "pending" | "confirmed">("pending");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.linkId !== undefined) setLinkId(route.params.linkId ?? "");
  }, [route?.params?.linkId]);

  useEffect(() => {
    setClientName("");
    if (linkId) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
  }, [linkId]);

  const key = JSON.stringify({ status, linkId });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listAgentPayments({ status, linkId, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
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

  return (
    <Page>
      <Title>💳 Pagamentos</Title>
      <Text style={u.muted}>Pagamentos das encomendas dos seus clientes: dinheiro, dinheiro móvel e transferência, com a referência que o comprador indicou.</Text>

      {linkId ? (
        <Card>
          <Text style={u.strong}>👤 Pagamentos de {clientName || "um cliente"}</Text>
          <View style={u.row}>
            <Btn
              small
              kind="outline"
              label="Ver todos os clientes"
              onPress={() => {
                setLinkId("");
                navigation.setParams({ linkId: undefined });
              }}
            />
            <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: linkId })} />
          </View>
        </Card>
      ) : null}

      <View style={u.grid}>
        {(
          [
            ["⏳ Por confirmar", String(counts.pending)],
            ["💰 Valor por confirmar", money(counts.pendingValue)],
            ["✅ Confirmados", String(counts.confirmed)],
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
        <Chip label={`Por confirmar (${counts.pending})`} active={status === "pending"} onPress={() => setStatus("pending")} />
        <Chip label={`Confirmados (${counts.confirmed})`} active={status === "confirmed"} onPress={() => setStatus("confirmed")} />
        <Chip label="Todos" active={status === ""} onPress={() => setStatus("")} />
      </View>

      <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} pagamento(s)`}</Text>

      {error ? <Empty text={error} /> : null}
      {!busy && !error && items.length === 0 ? (
        <Empty text={status === "pending" ? "Não há pagamentos por confirmar." : "Nenhum pagamento encontrado."} />
      ) : null}

      {items.map((p) => (
        <Card key={p.id}>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.amount !== null && p.amount !== undefined ? money(p.amount) : "Pagamento"}</Text>
            <Badge label={humanize(p.status)} color={p.pending ? "#F9A825" : "#2E7D32"} />
          </View>
          <Text style={u.muted}>
            {humanize(p.method)}
            {p.reference ? ` · ref. ${p.reference}` : ""}
          </Text>
          {p.createdAt ? <Text style={u.muted}>{formatDateTime(p.createdAt)}</Text> : null}

          {p.order ? (
            <>
              <Text style={[u.muted, { marginTop: 4 }]}>
                Encomenda {shortId(p.order.id)} ({money(p.order.total)}) ·{" "}
                <Text style={{ color: STAGE_COLOR[p.order.stage] ?? "#757575" }}>{humanize(p.order.stage)}</Text>
              </Text>
              <Text style={u.muted}>
                🛒 {p.order.buyer?.name ?? "Comprador"}
                {p.order.buyer?.isClient ? " ⭐" : ""} → 🏪 {p.order.seller?.name ?? "Vendedor"}
                {p.order.seller?.isClient ? " ⭐" : ""}
              </Text>

              <View style={u.row}>
                <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("AgentOrder", { id: p.order.id })} />
                {p.pending && p.order.buyer ? (
                  <Btn
                    small
                    kind="outline"
                    label="💬 Falar com o comprador"
                    onPress={() => navigation.navigate("Chat", { userId: p.order.buyer.id, userName: p.order.buyer.name })}
                  />
                ) : null}
                {p.pending && p.order.seller ? (
                  <Btn
                    small
                    kind="outline"
                    label="💬 Falar com o vendedor"
                    onPress={() => navigation.navigate("Chat", { userId: p.order.seller.id, userName: p.order.seller.name })}
                  />
                ) : null}
              </View>
            </>
          ) : null}
        </Card>
      ))}

      {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}

      <Text style={[u.muted, { marginTop: 12 }]}>
        A confirmação do pagamento faz-se na conta de quem o recebe (o vendedor). Se ele é seu cliente, abra uma sessão de ajuda a partir da encomenda.
      </Text>
    </Page>
  );
}
