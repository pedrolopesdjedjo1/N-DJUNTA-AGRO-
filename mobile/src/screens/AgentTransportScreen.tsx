import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ClientPicker from "../components/agent/ClientPicker";
import { listAgentDeliveries, listAgentTransporters } from "../api/agent";
import { getGovRegions } from "../api/gov";
import { beginAssist } from "../utils/assistStart";
import { STAGE_COLOR, humanize, minutesText, shortId } from "../constants/agentOps";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";

const EMPTY_DELIVERIES = { counts: { active: 0, attention: 0, done: 0, total: 0 }, items: [] as any[] };

// Transporte: acompanhar entregas e encontrar transportadores
export default function AgentTransportScreen({ navigation }: any) {
  const [tab, setTab] = useState<"deliveries" | "transporters">("deliveries");

  // ----- Entregas -----
  const [status, setStatus] = useState<"active" | "done">("active");
  const [attention, setAttention] = useState(false);
  const deliveries = useLoader(() => listAgentDeliveries({ status, attention }), EMPTY_DELIVERIES, [status, attention]);
  const dd: any = deliveries.data;

  // ----- Transportadores -----
  const [region, setRegion] = useState("");
  const [mine, setMine] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [request, setRequest] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  const key = JSON.stringify({ tab, region, mine, q });

  async function loadTransporters(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mineId = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listAgentTransporters({ region, q, scope: mine ? "mine" : "", page: nextPage });
      if (mineId !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setPage(nextPage);
    } catch (e) {
      if (mineId === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os transportadores."));
    } finally {
      if (mineId === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (tab === "deliveries") deliveries.reload();
      else loadTransporters(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  async function requestFor(link: any) {
    Alert.alert(
      "Pedir transporte",
      `Vai usar a conta de ${link.client.name} durante 30 minutos para pedir o transporte e comparar as ofertas. A pessoa recebe um aviso.`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Iniciar",
          onPress: async () => {
            setStarting(true);
            try {
              await beginAssist(link.id, "TRANSPORTE");
              navigation.navigate("AgentAssist");
            } catch (e) {
              Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível iniciar a sessão de ajuda."));
            } finally {
              setStarting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <AgentLayout active="AgentOrders">
      <Page>
        <Title>🚚 Transporte</Title>
        <Text style={u.muted}>Acompanhe as entregas dos seus clientes e encontre transportadores.</Text>

        <View style={u.row}>
          <Chip label={`Entregas${dd.counts.active ? ` (${dd.counts.active})` : ""}`} active={tab === "deliveries"} onPress={() => setTab("deliveries")} />
          <Chip label="Transportadores" active={tab === "transporters"} onPress={() => setTab("transporters")} />
        </View>

        {tab === "deliveries" ? (
          <>
            <View style={u.row}>
              <Chip label={`Em curso (${dd.counts.active})`} active={status === "active"} onPress={() => setStatus("active")} />
              <Chip label={`Concluídas (${dd.counts.done})`} active={status === "done"} onPress={() => setStatus("done")} />
              <Chip label={`⚠️ Atenção (${dd.counts.attention})`} active={attention} onPress={() => setAttention(!attention)} />
            </View>

            {dd.items.length === 0 && !deliveries.loading ? (
              <Empty text={status === "active" ? "Não há entregas em curso nas encomendas dos seus clientes." : "Ainda não há entregas concluídas."} />
            ) : (
              dd.items.map((x: any) => (
                <Card key={x.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🚚 Encomenda {shortId(x.orderId)}</Text>
                    <Badge label={humanize(x.status)} color={x.closed ? "#2E7D32" : STAGE_COLOR.TRANSPORTE} />
                  </View>
                  <Text style={u.muted}>
                    🛒 {x.order?.buyer?.name ?? "Comprador"} ← 🏪 {x.order?.seller?.name ?? "Vendedor"}
                  </Text>
                  {x.order ? <Text style={u.muted}>{money(x.order.total)}</Text> : null}
                  <Text style={u.muted}>
                    🚛 {x.transporter ? x.transporter.name : "Ainda sem transportador"}
                    {x.transporter?.isVerified ? " ✅" : ""}
                  </Text>
                  {x.lastLocation || x.lastLat !== null ? (
                    <Text style={u.muted}>
                      📍 {x.lastLocation ?? "Localização enviada"} · {minutesText(x.minutesSinceLocation)}
                    </Text>
                  ) : null}
                  {x.stale ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>⚠️ Sem notícias do transporte {minutesText(x.minutesSinceLocation)}</Text> : null}
                  {x.noTransporter ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>⚠️ Ninguém assumiu esta entrega</Text> : null}
                  <Btn small kind="outline" label="Ver a entrega" onPress={() => navigation.navigate("AgentDelivery", { id: x.id })} />
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            <Btn label={request ? "Fechar" : "🚚 Pedir transporte para um cliente"} onPress={() => setRequest(!request)} />
            {request ? (
              <Card>
                <Text style={u.strong}>Escolha o cliente</Text>
                <Text style={u.muted}>Abre-se uma sessão de ajuda na conta dele(a). Lá pede o transporte e compara as ofertas dos transportadores.</Text>
                <ClientPicker selected={[]} onToggle={requestFor} />
                {starting ? <Text style={u.muted}>A iniciar a sessão...</Text> : null}
              </Card>
            ) : null}

            <Field
              placeholder="Procurar transportador"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => setQ(text.trim())}
              returnKeyType="search"
            />
            {regions.length > 0 ? (
              <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
            ) : null}
            <View style={u.row}>
              <Chip label="⭐ Só os meus clientes" active={mine} onPress={() => setMine(!mine)} />
            </View>

            <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} transportador(es)`}</Text>
            {error ? <Empty text={error} /> : null}
            {!busy && !error && items.length === 0 ? <Empty text="Nenhum transportador encontrado." /> : null}

            {items.map((t) => {
              const wa = whatsappUrl(t.phone);
              return (
                <Card key={t.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                      {t.name} {t.isVerified ? "✅" : ""}
                    </Text>
                    {t.isClient ? <Badge label="⭐ Seu cliente" color="#00838F" /> : null}
                  </View>
                  {t.location ? <Text style={u.muted}>📍 {t.location}</Text> : null}
                  <Text style={u.muted}>
                    {t.rating ? `⭐ ${t.rating} (${t.ratingCount})` : "Sem avaliações"} · 🚚 {t.deliveries} entrega(s)
                  </Text>
                  <View style={u.row}>
                    <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: t.id, userName: t.name })} />
                    {t.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${t.phone}`)} /> : null}
                    {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
                    {t.linkId ? <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: t.linkId })} /> : null}
                  </View>
                </Card>
              );
            })}

            {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => loadTransporters(false)} disabled={busy} /> : null}
          </>
        )}
      </Page>
    </AgentLayout>
  );
}
