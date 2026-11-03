import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import TrDeliveryCard from "../components/transporter/TrDeliveryCard";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listTrAvailable, listTrOffers, closeTrOffer, listTrRequests, respondTrRequest } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { useMyPosition } from "../utils/trLocation";
import { labelOf } from "../utils/ngoCatalog";
import { TR_CARGO_ICON } from "../constants/transporterV2";
import { REQUEST_STATUS_COLOR } from "../constants/transporterSocial";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

type Tab = "loads" | "offers" | "requests";

export default function TrLoadsScreen({ navigation, route }: any) {
  const catalog = useTrCatalog();
  const { pos, refresh } = useMyPosition(false);
  const [tab, setTab] = useState<Tab>((route?.params?.tab as Tab) ?? "loads");

  // Cargas por perto
  const [cargo, setCargo] = useState("");
  const [loads, setLoads] = useState<any[]>([]);
  const [byCargo, setByCargo] = useState<Record<string, number>>({});
  const [loadsTotal, setLoadsTotal] = useState(0);

  // Ofertas e pedidos
  const [offers, setOffers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reqStatus, setReqStatus] = useState("PENDENTE");

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [replyId, setReplyId] = useState("");
  const [accepting, setAccepting] = useState(true);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab);
  }, [route?.params?.tab]);

  async function load() {
    setBusy(true);
    setError("");
    try {
      if (tab === "loads") {
        const r = await listTrAvailable({ sort: "PERTO", compatible: "yes", cargo, page: 1, lat: pos?.lat, lng: pos?.lng });
        setLoads(r.items);
        setLoadsTotal(r.total);
        setByCargo(r.summary.byCargo ?? {});
      } else if (tab === "offers") {
        setOffers(await listTrOffers());
      } else {
        const r = await listTrRequests({ status: reqStatus });
        setRequests(r.items);
        setCounts(r.counts);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível carregar."));
    } finally {
      setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, cargo, reqStatus, pos?.lat, pos?.lng])
  );

  function close(o: any) {
    Alert.alert("Encerrar a oferta", `"${o.fromText} → ${o.toText}" deixa de aparecer. Os pedidos por responder são recusados.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Encerrar",
        style: "destructive",
        onPress: async () => {
          try {
            await closeTrOffer(o.id);
            load();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível encerrar."));
          }
        },
      },
    ]);
  }

  function openReply(id: string, accept: boolean) {
    if (replyId === id && accepting === accept) {
      setReplyId("");
      return;
    }
    setReplyId(id);
    setAccepting(accept);
    setReply("");
  }

  async function sendReply(r: any) {
    if (!accepting && reply.trim().length < 3) {
      Alert.alert("Atenção", "Explique porque recusa, para a pessoa perceber.");
      return;
    }

    setSaving(true);
    try {
      const out = await respondTrRequest(r.id, { accept: accepting, message: reply.trim() || undefined });
      setReplyId("");
      if (out.assigned) Alert.alert("Entrega sua", "A entrega da encomenda ficou consigo. Combine a recolha com o vendedor.");
      load();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível responder."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TrLayout active="TrProfile">
      <Page>
        <Title>🧳 Cargas e ofertas de transporte</Title>

        <View style={u.row}>
          <Chip label="🆕 Cargas por perto" active={tab === "loads"} onPress={() => setTab("loads")} />
          <Chip label="📣 Minhas ofertas" active={tab === "offers"} onPress={() => setTab("offers")} />
          <Chip label="📨 Pedidos recebidos" active={tab === "requests"} onPress={() => setTab("requests")} />
        </View>

        {error ? <Empty text={error} /> : null}

        {tab === "loads" ? (
          <>
            <Text style={u.muted}>Cargas agrícolas, de pesca, artesanato, mercadorias, construção, vestuário e equipamentos, veículos e peças. Só as que servem ao seu veículo.</Text>
            {!pos ? (
              <Card>
                <Text style={u.muted}>Ative a localização para ver as cargas por ordem de distância até si.</Text>
                <Btn small label="📍 Usar a minha localização" onPress={() => refresh(true)} />
              </Card>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label="Todos os tipos" active={cargo === ""} onPress={() => setCargo("")} />
              {catalog.cargoTypes.map((c) => (
                <Chip key={c.value} label={`${TR_CARGO_ICON[c.value] ?? "📦"} ${c.label} (${byCargo[c.value] ?? 0})`} active={cargo === c.value} onPress={() => setCargo(c.value)} />
              ))}
            </ScrollView>
            <Text style={[u.muted, { marginTop: 8 }]}>{busy && loads.length === 0 ? "A carregar..." : `${formatNumber(loadsTotal)} carga(s)`}</Text>
            {!busy && !error && loads.length === 0 ? <Empty text="Não há cargas que sirvam ao seu veículo nestas regiões." /> : null}
            {loads.map((c) => (
              <TrDeliveryCard key={c.id} item={c} catalog={catalog} onPress={() => navigation.navigate("TrDelivery", { id: c.id })} />
            ))}
            <Btn kind="outline" label="Ver todas as entregas disponíveis" onPress={() => navigation.navigate("TrDeliveries", { tab: "available" })} />
          </>
        ) : null}

        {tab === "offers" ? (
          <>
            <Text style={u.muted}>Publique uma viagem que vai fazer, com os quilos que tem livres. Quem precisa de transporte vê a oferta e pede-lhe. Até 5 ofertas ativas.</Text>
            <Btn label="➕ Nova oferta de transporte" onPress={() => navigation.navigate("TrOfferForm")} />
            {!busy && !error && offers.length === 0 ? <Empty text="Ainda não publicou ofertas." /> : null}
            {offers.map((o) => (
              <Card key={o.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {o.fromText} → {o.toText}
                  </Text>
                  <Badge label={o.status !== "ATIVA" ? "Encerrada" : o.expired ? "Passou a data" : "Ativa"} color={o.status === "ATIVA" && !o.expired ? "#2E7D32" : "#757575"} />
                </View>
                <Text style={u.muted}>
                  🗓️ {formatDate(o.departureDate)} · ⚖️ {o.capacityKg} kg livres · {o.price ? money(o.price) : "preço a combinar"}
                </Text>
                {o.cargoTypes.length > 0 ? (
                  <Text style={u.muted}>{(o.cargoTypes as string[]).map((t) => `${TR_CARGO_ICON[t] ?? "📦"} ${labelOf(catalog.cargoTypes, t)}`).join(" · ")}</Text>
                ) : null}
                {o.notes ? <Text style={[u.muted, { marginTop: 2 }]}>{o.notes}</Text> : null}
                {o.pendingRequests > 0 ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>📨 {o.pendingRequests} pedido(s) por responder</Text> : null}
                {o.status === "ATIVA" ? (
                  <View style={u.row}>
                    {o.pendingRequests > 0 ? <Btn small label="Ver os pedidos" onPress={() => setTab("requests")} /> : null}
                    <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("TrOfferForm", { offer: o })} />
                    <Btn small kind="danger" label="Encerrar" onPress={() => close(o)} />
                  </View>
                ) : null}
              </Card>
            ))}
          </>
        ) : null}

        {tab === "requests" ? (
          <>
            <Text style={u.muted}>Pedidos de pessoas que querem transportar nas suas ofertas. Se o pedido traz uma encomenda com entrega por aceitar, ao aceitar a entrega fica sua.</Text>
            <View style={u.row}>
              <Chip label={`Por responder (${counts.PENDENTE ?? 0})`} active={reqStatus === "PENDENTE"} onPress={() => setReqStatus("PENDENTE")} />
              <Chip label={`Aceites (${counts.ACEITE ?? 0})`} active={reqStatus === "ACEITE"} onPress={() => setReqStatus("ACEITE")} />
              <Chip label={`Recusados (${counts.RECUSADA ?? 0})`} active={reqStatus === "RECUSADA"} onPress={() => setReqStatus("RECUSADA")} />
            </View>
            {!busy && !error && requests.length === 0 ? <Empty text="Nenhum pedido nesta lista." /> : null}
            {requests.map((r) => (
              <Card key={r.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.requester?.name ?? "Pessoa"}</Text>
                  <Badge label={labelOf(catalog.requestStatus, r.status) || r.status} color={REQUEST_STATUS_COLOR[r.status] ?? "#757575"} />
                </View>
                {r.requester?.location ? <Text style={u.muted}>📍 {r.requester.location}</Text> : null}
                <Text style={u.muted}>
                  {r.route} · {r.departureDate ? formatDate(r.departureDate) : ""}
                </Text>
                <Text style={{ marginTop: 4, lineHeight: 20 }}>{r.message}</Text>
                {r.orderCode ? <Text style={u.muted}>📦 Encomenda {r.orderCode}</Text> : null}
                {r.response ? <Text style={[u.muted, { marginTop: 2 }]}>A sua resposta: {r.response}</Text> : null}
                <View style={u.row}>
                  {r.requester ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: r.requester.id, userName: r.requester.name })} /> : null}
                  {r.status === "PENDENTE" ? <Btn small label="✅ Aceitar" onPress={() => openReply(r.id, true)} /> : null}
                  {r.status === "PENDENTE" ? <Btn small kind="danger" label="Recusar" onPress={() => openReply(r.id, false)} /> : null}
                </View>
                {replyId === r.id ? (
                  <View style={{ marginTop: 8 }}>
                    <Field label={accepting ? "Mensagem (opcional)" : "Porque recusa (a pessoa vê)"} value={reply} onChangeText={setReply} multiline placeholder={accepting ? "Ex: Combinamos a hora por mensagem." : "Ex: Já tenho a carga cheia nesse dia."} />
                    <Btn kind={accepting ? "primary" : "danger"} label={saving ? "A enviar..." : accepting ? "Confirmar" : "Enviar a recusa"} onPress={() => sendReply(r)} disabled={saving} />
                  </View>
                ) : null}
              </Card>
            ))}
          </>
        ) : null}
      </Page>
    </TrLayout>
  );
}
