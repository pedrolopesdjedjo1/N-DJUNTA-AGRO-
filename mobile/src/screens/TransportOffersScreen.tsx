import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listPublicTransportOffers, requestPublicTransport, listMyTransportRequests } from "../api/transporterV2";
import { getGovRegions } from "../api/gov";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { TR_CARGO_ICON, TR_VEHICLE_ICON } from "../constants/transporterV2";
import { REQUEST_STATUS_COLOR } from "../constants/transporterSocial";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

type Tab = "offers" | "mine";

// Ofertas de transporte: qualquer pessoa vê as viagens dos transportadores e pede transporte
export default function TransportOffersScreen({ navigation, route }: any) {
  const catalog = useTrCatalog();
  const orderId: string | undefined = route?.params?.orderId;

  const [tab, setTab] = useState<Tab>("offers");
  const [region, setRegion] = useState("");
  const [cargo, setCargo] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [mine, setMine] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [askId, setAskId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  async function load(reset: boolean) {
    const mineId = ++requestId.current;
    setBusy(true);
    setError("");
    try {
      if (tab === "offers") {
        const next = reset ? 1 : page + 1;
        const r = await listPublicTransportOffers({ region, cargo, q, page: next });
        if (mineId !== requestId.current) return;
        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setPage(next);
      } else {
        const r = await listMyTransportRequests();
        if (mineId === requestId.current) setMine(r);
      }
    } catch (e) {
      if (mineId === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar."));
    } finally {
      if (mineId === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, region, cargo, q])
  );

  async function send(o: any) {
    if (message.trim().length < 5) {
      Alert.alert("Atenção", "Explique o que quer transportar (pelo menos 5 letras).");
      return;
    }

    setSending(true);
    try {
      await requestPublicTransport(o.id, { message: message.trim(), orderId });
      Alert.alert("Pedido enviado", "O transportador recebeu o seu pedido e responde-lhe por notificação.");
      setAskId("");
      setMessage("");
      setTab("mine");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o pedido."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Page>
      <Title>🚚 Ofertas de transporte</Title>
      <Text style={u.muted}>Transportadores que vão fazer uma viagem e têm espaço livre. Peça-lhes para levar os seus produtos.</Text>
      {orderId ? <Text style={{ color: "#2E7D32" }}>O pedido fica ligado à sua encomenda.</Text> : null}

      <View style={u.row}>
        <Chip label="Ofertas" active={tab === "offers"} onPress={() => setTab("offers")} />
        <Chip label="Os meus pedidos" active={tab === "mine"} onPress={() => setTab("mine")} />
      </View>

      {error ? <Empty text={error} /> : null}

      {tab === "offers" ? (
        <>
          <Field placeholder="Procurar por local ou transportador" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text.trim())} returnKeyType="search" />
          {regions.length > 0 ? <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll /> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label="Todos os produtos" active={cargo === ""} onPress={() => setCargo("")} />
            {catalog.cargoTypes.map((c) => (
              <Chip key={c.value} label={`${TR_CARGO_ICON[c.value] ?? "📦"} ${c.label}`} active={cargo === c.value} onPress={() => setCargo(c.value)} />
            ))}
          </ScrollView>

          <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} oferta(s)`}</Text>
          {!busy && !error && items.length === 0 ? <Empty text="Não há ofertas com estes filtros." /> : null}

          {items.map((o) => (
            <Card key={o.id}>
              <Text style={u.strong}>
                {o.fromText} → {o.toText}
              </Text>
              <Text style={u.muted}>
                🗓️ {formatDate(o.departureDate)} · ⚖️ {o.capacityKg} kg livres · {o.price ? money(o.price) : "preço a combinar"}
              </Text>
              {o.cargoTypes.length > 0 ? (
                <Text style={u.muted}>{(o.cargoTypes as string[]).map((t) => `${TR_CARGO_ICON[t] ?? "📦"} ${labelOf(catalog.cargoTypes, t)}`).join(" · ")}</Text>
              ) : null}
              {o.notes ? <Text style={[u.muted, { marginTop: 2 }]}>{o.notes}</Text> : null}
              <Text style={{ marginTop: 4 }}>
                {TR_VEHICLE_ICON[o.transporter.vehicleType ?? "OUTRO"] ?? "🚚"} {o.transporter.name} {o.transporter.isVerified ? "✅" : ""}
              </Text>
              {o.isMine ? (
                <Badge label="É a sua oferta" color="#757575" />
              ) : (
                <View style={u.row}>
                  <Btn small label={askId === o.id ? "Cancelar" : "📨 Pedir transporte"} onPress={() => { setAskId(askId === o.id ? "" : o.id); setMessage(""); }} />
                  <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: o.transporter.id, userName: o.transporter.name })} />
                </View>
              )}
              {askId === o.id ? (
                <View style={{ marginTop: 8 }}>
                  <Field label="O que quer transportar?" value={message} onChangeText={setMessage} multiline placeholder="Ex: 10 sacos de arroz de Gabú para Bissau, na quinta." />
                  <Btn label={sending ? "A enviar..." : "Enviar o pedido"} onPress={() => send(o)} disabled={sending} />
                </View>
              ) : null}
            </Card>
          ))}

          {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
        </>
      ) : (
        <>
          {!busy && !error && mine.length === 0 ? <Empty text="Ainda não pediu transporte a nenhuma oferta." /> : null}
          {mine.map((r) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.route ?? "Oferta"}</Text>
                <Badge label={labelOf(catalog.requestStatus, r.status) || r.status} color={REQUEST_STATUS_COLOR[r.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>
                {r.transporter?.name ?? "Transportador"}
                {r.departureDate ? ` · ${formatDate(r.departureDate)}` : ""}
              </Text>
              <Text style={{ marginTop: 4 }}>{r.message}</Text>
              {r.response ? <Text style={{ marginTop: 4 }}>💬 {r.response}</Text> : null}
              {r.transporter ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: r.transporter.id, userName: r.transporter.name })} /> : null}
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
