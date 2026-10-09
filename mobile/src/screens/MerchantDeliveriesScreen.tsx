import React, { useEffect, useState } from "react";
import { View, Text, Modal, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getDeliveries, getOrders, getTransporters, requestDelivery, setDeliveryStatus } from "../api/orders";
import { getApiErrorMessage } from "../api/errorMessage";
import { DELIVERY_STATUS, money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

interface Choice {
  transporterId: string;
  offerId?: string;
  price?: number;
}

export default function MerchantDeliveriesScreen({ navigation, route }: any) {
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
  const [choice, setChoice] = useState<Choice | null>(null);
  const [price, setPrice] = useState("");
  const [pickup, setPickup] = useState("");
  const [sending, setSending] = useState(false);

  const waiting = loader.data.orders.filter(
    (o: any) =>
      ["ACEITO", "EM_PREPARACAO", "ENVIADO"].includes(o.status) && (!o.delivery || o.delivery.status === "CANCELADA")
  );

  async function openRequest(id: string) {
    setOrderId(id);
    setChoice(null);
    setPrice("");
    setPickup("");
    try {
      setTransporters(await getTransporters());
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível carregar os transportadores."));
    }
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
      const d = new Date(pickup.trim());
      if (isNaN(d.getTime())) {
        Alert.alert("Atenção", "Use a data no formato AAAA-MM-DD.");
        return;
      }
      pickupAt = d.toISOString();
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

  return (
    <>
      <Page loader={loader}>
        <Title>🚚 Entregas</Title>

        <SubTitle>Pedidos à espera de transporte</SubTitle>
        {waiting.length === 0 ? (
          <Empty text="Nenhum pedido à espera de transporte." />
        ) : (
          waiting.map((o: any) => (
            <Card key={o.id}>
              <Text style={u.strong}>Pedido #{o.id.slice(0, 6).toUpperCase()}</Text>
              <Text style={u.muted}>
                {o.buyer?.name ?? "Cliente"} · {money(o.total)}
              </Text>
              {o.deliveryAddress ? <Text style={u.muted}>Endereço: {o.deliveryAddress}</Text> : null}
              <Btn small label="Solicitar transportador" onPress={() => openRequest(o.id)} />
            </Card>
          ))
        )}

        <SubTitle>Entregas</SubTitle>
        {loader.data.deliveries.length === 0 ? (
          <Empty text="Ainda não há entregas." />
        ) : (
          loader.data.deliveries.map((d: any) => {
            const st = DELIVERY_STATUS[d.status];
            return (
              <Card key={d.id}>
                <View style={u.between}>
                  <Text style={u.strong}>Pedido #{d.orderId.slice(0, 6).toUpperCase()}</Text>
                  <Badge label={st?.label ?? d.status} color={st?.color ?? "#757575"} />
                </View>
                <Text style={u.muted}>Cliente: {d.buyer?.name ?? "—"}</Text>
                {d.order?.deliveryAddress ? <Text style={u.muted}>Endereço: {d.order.deliveryAddress}</Text> : null}
                <Text style={u.muted}>Transportador: {d.transporter?.name ?? "—"}</Text>
                {d.price !== null && d.price !== undefined ? <Text style={u.muted}>Preço: {money(d.price)}</Text> : null}
                {d.pickupAt ? <Text style={u.muted}>Recolha: {formatDate(d.pickupAt)}</Text> : null}

                <View style={u.row}>
                  {["RECOLHIDA", "EM_TRANSITO"].includes(d.status) && (
                    <Btn small label="Confirmar entrega" onPress={() => changeStatus(d, "ENTREGUE")} />
                  )}
                  {["SOLICITADA", "ACEITA"].includes(d.status) && (
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
          })
        )}
      </Page>

      <Modal visible={!!orderId} animationType="slide" onRequestClose={() => setOrderId(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Title>Escolher transportador</Title>

            {transporters.length === 0 ? (
              <Empty text="Ainda não há transportadores registados." />
            ) : (
              transporters.map((t) => (
                <Card key={t.id}>
                  <Text style={u.strong}>
                    {t.name} {t.isVerified ? "✅" : ""}
                  </Text>
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
                      const active = choice?.offerId === offer.id;
                      return (
                        <TouchableOpacity
                          key={offer.id}
                          style={[u.chip, active && u.chipActive, { marginTop: 8 }]}
                          onPress={() => setChoice({ transporterId: t.id, offerId: offer.id, price: offer.price })}
                        >
                          <Text style={[u.chipText, active && u.chipTextActive]}>
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
            <Field label="Data de recolha (AAAA-MM-DD, opcional)" value={pickup} onChangeText={setPickup} placeholder="2026-10-15" />

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
