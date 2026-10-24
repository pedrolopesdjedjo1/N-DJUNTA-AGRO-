import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, Card, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import OrderCard from "../components/agent/OrderCard";
import { listAgentOrders, getAgentClient } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { STAGE_ICON } from "../constants/agentOps";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";

const EMPTY_SUMMARY = {
  open: 0,
  attention: 0,
  byStage: {} as Record<string, number>,
  openValue: 0,
  completed30: 0,
  completedValue30: 0,
  total: 0,
};

// Encomendas dos clientes do agente: acompanhar, confirmar, contactar e resolver problemas
export default function AgentOrdersScreen({ navigation, route }: any) {
  const catalog = useAgentCatalog();

  const [linkId, setLinkId] = useState<string>(route?.params?.linkId ?? "");
  const [clientName, setClientName] = useState("");
  const [scope, setScope] = useState<"open" | "closed" | "all">("open");
  const [stage, setStage] = useState("");
  const [side, setSide] = useState("");
  const [attention, setAttention] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
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

  const key = JSON.stringify({ linkId, scope, stage, side, attention, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listAgentOrders({ scope, stage, side, linkId, q, attention, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as encomendas."));
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

  const stageOptions = catalog.orderStages
    .filter((s) => (scope === "closed" ? ["CONCLUIDA", "CANCELADA"].includes(s.value) : scope === "open" ? !["CONCLUIDA", "CANCELADA"].includes(s.value) : true))
    .map((s) => ({
      value: s.value,
      label: `${STAGE_ICON[s.value] ?? ""} ${s.label}${scope !== "closed" && summary.byStage[s.value] ? ` (${summary.byStage[s.value]})` : ""}`.trim(),
    }));

  return (
    <AgentLayout active="AgentOrders">
      <Page>
        <Title>📦 Encomendas</Title>
        <Text style={u.muted}>As encomendas em que participam os seus clientes, como compradores ou vendedores.</Text>

        {linkId ? (
          <Card>
            <Text style={u.strong}>👤 Encomendas de {clientName || "um cliente"}</Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Ver todos os clientes" onPress={() => { setLinkId(""); navigation.setParams({ linkId: undefined }); }} />
              <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: linkId })} />
            </View>
          </Card>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["📦 Em aberto", formatNumber(summary.open)],
              ["⚠️ Precisam de atenção", formatNumber(summary.attention)],
              ["💰 Valor em aberto", money(summary.openValue)],
              ["🏁 Concluídas (30 dias)", `${summary.completed30} · ${money(summary.completedValue30)}`],
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
          <Btn small kind="outline" label="🚚 Transporte" onPress={() => navigation.navigate("AgentTransport")} />
          <Btn small kind="outline" label="💳 Pagamentos" onPress={() => navigation.navigate("AgentPayments")} />
          <Btn small kind="outline" label="🆘 Chamados" onPress={() => navigation.navigate("AgentSupport")} />
        </View>

        <View style={u.row}>
          <Chip label="Em aberto" active={scope === "open"} onPress={() => { setScope("open"); setStage(""); }} />
          <Chip label="Histórico" active={scope === "closed"} onPress={() => { setScope("closed"); setStage(""); }} />
          <Chip label="Todas" active={scope === "all"} onPress={() => { setScope("all"); setStage(""); }} />
        </View>

        <Field
          placeholder="Procurar por número ou nome"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ChipGroup label="Etapa" options={stageOptions} value={stage} onChange={setStage} allowEmpty scroll />
        <View style={u.row}>
          <Chip label="🛒 Cliente é comprador" active={side === "COMPRADOR"} onPress={() => setSide(side === "COMPRADOR" ? "" : "COMPRADOR")} />
          <Chip label="🏪 Cliente é vendedor" active={side === "VENDEDOR"} onPress={() => setSide(side === "VENDEDOR" ? "" : "VENDEDOR")} />
          <Chip label="⚠️ Só as que precisam de atenção" active={attention} onPress={() => setAttention(!attention)} />
        </View>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} encomenda(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? (
          <Empty text={summary.total === 0 ? "Os seus clientes ainda não têm encomendas." : "Nenhuma encomenda com estes filtros."} />
        ) : null}

        {items.map((o) => (
          <OrderCard key={o.id} item={o} stages={catalog.orderStages} onPress={() => navigation.navigate("AgentOrder", { id: o.id })} />
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AgentLayout>
  );
}
