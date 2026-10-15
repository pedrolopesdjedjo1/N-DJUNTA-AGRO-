import React, { useEffect, useState } from "react";
import { View, Text, Modal, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getDeliveries, getOrders, requestDelivery, setDeliveryStatus } from "../api/orders";
import { nearbyTransporters, getTracking } from "../api/tracking";
import { getApiErrorMessage } from "../api/errorMessage";
import { DELIVERY_STATUS, money, formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

interface Choice {
  transporterId: string;
  offerId?: string;
  price?: number;
}

const ACTIVE = ["SOLICITADA", "ACEITA", "RECOLHIDA", "EM_TRANSITO"];

export default function FarmerTransportScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const loader = useLoader(
    async () => {
      const [deliveries, orders] = await Promise.all([getDeliveries(), getOrders("seller")]);
      return { deliveries, orders };
    },
    { deliveries: [] as any[], orders: [] as any[] }
  );

  const [orderId, setOrderId] = useState<string | null>(null);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [near, setNear] = useState("");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [price, setPrice] = useState("");
  const [pickup, setPickup] = useState("");
  const [sending, setSending] = useState(false);
  const [tracking, setTracking] = useState<Record<string, any>>({});

  const waiting = loader.data.orders.filter(
    (o: any) =>
      ["ACEITO", "EM_PREPARACAO", "PRONTO", "ENVIADO"].includes(o.status) &&
      (!o.delivery || o.delivery.status === "CANCELADA")
  );
  const active = loader.data.deliveries.filter((d: any) => ACTIVE.includes(d.status));
  const history = loader.data.deliveries.filter((d: any) => !ACTIVE.includes(d.status));

  async function loadTransporters(place: string) {
    try {
      setTransporters(await nearbyTransporters(place.trim() || undefined));
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível carregar os transportadores."));
    }
  }

  async function openRequest(id: string) {
    setOrderId(id);
    setChoice(null);
    setPrice("");
    setPickup("");
    setNear("");
    await loadTransporters("");
  }

  useEffect(() => {
    if (route && route.params && route.params.orderId) openRequest(route.params.orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    if (!orderId || !choice) {
      Alert.alert("Atenção", "Escolha um transportador.");
      return;
    }

    let pickupAt: string | undefined;
    if (pickup.trim()) {
      const date = new Date(pickup.trim());
      if (isNaN(date.getTime())) {
        Alert.alert("Atenção", "Use a data no formato AAAA-MM-DD.");
        return;
      }
      pickupAt = date.toISOString();
    }

    const finalPrice = choice.offerId ? choice.price : price.trim() ? Number(price.replace(",", ".")) : undefined;

    setSending(true);
    try {
      await requestDelivery(orderId, {
        transporterId: choice.transporterId,
        offerId: choice.offerId,
        price: finalPrice,
        pickupAt,
      });
      setOrderId(null);
      loader.reload();
      Alert.alert("Pronto", "Transportador solicitado.");
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível solicitar o transportador."));
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(delivery: any, status: string) {
    try {
      await setDeliveryStatus(delivery.id, status);
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar a entrega."));
    }
  }

  async function showTracking(delivery: any) {
    try {
      const data = await getTracking(delivery.id);
      setTracking((prev) => ({ ...prev, [delivery.id]: data }));
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível ver a localização."));
    }
  }

  function deliveryCard(d: any, withActions: boolean) {
    const st = DELIVERY_STATUS[d.status];
    const t = tracking[d.id];
    return (
      <Card key={d.id}>
        <View style={u.between}>
          <Text style={u.strong}>Pedido #{d.orderId.slice(0, 6).toUpperCase()}</Text>
          <Badge label={st?.label ?? d.status} color={st?.color ?? "#757575"} />
        </View>
        <Text style={u.muted}>Comprador: {d.buyer?.name ?? "—"}</Text>
        {d.order?.deliveryAddress ? <Text style={u.muted}>Endereço: {d.order.deliveryAddress}</Text> : null}
        <Text style={u.muted}>Transportador: {d.transporter?.name ?? "—"}</Text>
        {d.price !== null && d.price !== undefined ? <Text style={u.muted}>Preço do transporte: {money(d.price)}</Text> : null}
        {d.pickupAt ? <Text style={u.muted}>Recolha: {formatDate(d.pickupAt)}</Text> : null}

        {t ? (
          <View style={{ marginTop: 8 }}>
            {t.lastLocationAt ? (
              <>
                <Text style={u.strong}>📍 {t.lastLocation || "Localização partilhada"}</Text>
                <Text style={u.muted}>Atualizado: {formatDateTime(t.lastLocationAt)}</Text>
                {t.lastLat !== null && t.lastLng !== null ? (
                  <Btn
                    small
                    kind="outline"
                    label="🗺️ Abrir no mapa"
                    onPress={() => Linking.openURL(`https://www.google.com/maps?q=${t.lastLat},${t.lastLng}`)}
                  />
                ) : null}
              </>
            ) : (
              <Text style={u.muted}>O transportador ainda não partilhou a localização.</Text>
            )}
          </View>
        ) : null}

        <View style={u.row}>
          {withActions && ["ACEITA", "RECOLHIDA", "EM_TRANSITO"].includes(d.status) ? (
            <Btn small kind="outline" label="📍 Ver localização" onPress={() => showTracking(d)} />
          ) : null}
          {withActions && d.status === "ACEITA" && (
            <Btn small label="Confirmar recolha" onPress={() => changeStatus(d, "RECOLHIDA")} />
          )}
          {withActions && ["RECOLHIDA", "EM_TRANSITO"].includes(d.status) && (
            <Btn small label="Confirmar entrega" onPress={() => changeStatus(d, "ENTREGUE")} />
          )}
          {withActions && ["SOLICITADA", "ACEITA"].includes(d.status) && (
            <Btn small kind="danger" label="Cancelar" onPress={() => changeStatus(d, "CANCELADA")} />
          )}
          {d.transporter?.phone ? (
            <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${d.transporter.phone}`)} />
          ) : null}
          {d.transporter ? (
            <Btn
              small
              kind="outline"
              label="💬 Mensagem"
              onPress={() => navigation.navigate("Chat", { userId: d.transporter.id, userName: d.transporter.name })}
            />
          ) : null}
        </View>
      </Card>
    );
  }

  return (
    <>
      <Page loader={loader}>
        <Title>🚚 Transporte</Title>

        <SubTitle>Pedidos à espera de transporte</SubTitle>
        {waiting.length === 0 ? (
          <Empty text="Nenhum pedido à espera de transporte." />
        ) : (
          waiting.map((o: any) => (
            <Card key={o.id}>
              <Text style={u.strong}>Pedido #{o.id.slice(0, 6).toUpperCase()}</Text>
              <Text style={u.muted}>
                {o.buyer?.name ?? "Comprador"} · {money(o.total)}
              </Text>
              {o.deliveryAddress ? <Text style={u.muted}>Endereço: {o.deliveryAddress}</Text> : null}
              <Btn small label="🚚 Solicitar transportador" onPress={() => openRequest(o.id)} />
            </Card>
          ))
        )}

        <SubTitle>Acompanhar transporte</SubTitle>
        {active.length === 0 ? <Empty text="Nenhum transporte em curso." /> : active.map((d: any) => deliveryCard(d, true))}

        <SubTitle>Histórico de transportes</SubTitle>
        {history.length === 0 ? <Empty text="Ainda não há histórico." /> : history.map((d: any) => deliveryCard(d, false))}
      </Page>

      <Modal visible={!!orderId} animationType="slide" onRequestClose={() => setOrderId(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Title>Escolher transporte</Title>

            <Field
              placeholder="Procurar perto de... (ex: Bafatá)"
              value={near}
              onChangeText={setNear}
              onSubmitEditing={() => loadTransporters(near)}
              returnKeyType="search"
            />
            <Btn small kind="outline" label="🔎 Procurar" onPress={() => loadTransporters(near)} />

            {transporters.length === 0 ? (
              <Empty text="Nenhum transportador encontrado." />
            ) : (
              transporters.map((t) => (
                <Card key={t.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                      {t.name} {t.isVerified ? "✅" : ""}
                    </Text>
                    {t.isNear ? <Badge label="Perto de si" color="#2E7D32" /> : null}
                  </View>
                  {t.phone ? <Text style={u.muted}>📞 {t.phone}</Text> : null}
                  {t.location ? <Text style={u.muted}>📍 {t.location}</Text> : null}

                  {t.transportOffers.length === 0 ? (
                    <TouchableOpacity
                      style={[u.chip, choice?.transporterId === t.id && !choice?.offerId && u.chipActive, { marginTop: 8 }]}
                      onPress={() => setChoice({ transporterId: t.id })}
                    >
                      <Text style={[u.chipText, choice?.transporterId === t.id && !choice?.offerId && u.chipTextActive]}>
                        Combinar preço
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    t.transportOffers.map((offer: any) => {
                      const selected = choice?.offerId === offer.id;
                      return (
                        <TouchableOpacity
                          key={offer.id}
                          style={[u.chip, selected && u.chipActive, { marginTop: 8 }]}
                          onPress={() => setChoice({ transporterId: t.id, offerId: offer.id, price: offer.price })}
                        >
                          <Text style={[u.chipText, selected && u.chipTextActive]}>
                            {offer.origin} → {offer.destination} · {money(offer.price)} · {offer.capacity}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </Card>
              ))
            )}

            {choice && !choice.offerId ? (
              <Field label="Preço combinado (FCFA)" value={price} onChangeText={setPrice} keyboardType="numeric" />
            ) : null}
            {choice?.offerId ? <Text style={[u.strong, { marginTop: 10 }]}>Preço do transporte: {money(choice.price)}</Text> : null}
            <Field label="Data de recolha (AAAA-MM-DD, opcional)" value={pickup} onChangeText={setPickup} placeholder="2026-10-20" />

            <View style={u.row}>
              <Btn label={sending ? "A enviar..." : "Confirmar"} onPress={confirm} disabled={sending} />
              <Btn kind="outline" label="Fechar" onPress={() => setOrderId(null)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
