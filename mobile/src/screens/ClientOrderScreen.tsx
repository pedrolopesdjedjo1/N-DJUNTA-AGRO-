import React, { useEffect, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { useLoader } from "../components/ui";
import {
  getMyOrder,
  getCheckoutOptions,
  cancelMyOrder,
  confirmReceived,
  changeOrderPayment,
  declarePayment,
} from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { DELIVERY_STATUS, ORDER_STATUS, money, formatDate, formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

const PAY: Record<string, { label: string; color: string }> = {
  PAGO: { label: "Pago", color: "#2E7D32" },
  AGUARDA_CONFIRMACAO: { label: "A aguardar confirmação do vendedor", color: "#F9A825" },
  POR_PAGAR: { label: "Por pagar", color: "#757575" },
};

export default function ClientOrderScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;

  const loader = useLoader(
    async () => {
      const [order, options] = await Promise.all([
        getMyOrder(id),
        getCheckoutOptions().catch(() => ({ payment: [] as any[] })),
      ]);
      return { order, options };
    },
    null as any,
    [id]
  );

  const data: any = loader.data;
  const o: any = data?.order;

  const [showPay, setShowPay] = useState(false);
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const trackingOn =
    !!o && o.delivery && ["ACEITA", "RECOLHIDA", "EM_TRANSITO"].includes(o.delivery.status) && o.status !== "CONCLUIDO";

  // Atualiza sozinho a cada 30 segundos enquanto a entrega está em curso
  useEffect(() => {
    if (!trackingOn) return;
    const timer = setInterval(async () => {
      try {
        const fresh = await getMyOrder(id);
        loader.setData({ ...loader.data, order: fresh });
      } catch (e) {
        // sem rede: tenta outra vez no próximo ciclo
      }
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingOn, id]);

  function apply(fresh: any) {
    loader.setData({ ...loader.data, order: fresh });
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      const fresh = await work();
      apply(fresh);
      return true;
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    Alert.alert("Cancelar encomenda", "Tem a certeza?", [
      { text: "Não", style: "cancel" },
      { text: "Cancelar pedido", style: "destructive", onPress: () => run(() => cancelMyOrder(id), "Não foi possível cancelar.") },
    ]);
  }

  function received() {
    Alert.alert("Confirmar recebimento", "Recebeu a encomenda?", [
      { text: "Ainda não", style: "cancel" },
      {
        text: "Sim, recebi",
        onPress: async () => {
          const ok = await run(() => confirmReceived(id), "Não foi possível confirmar.");
          if (ok) {
            Alert.alert("Obrigado!", "Quer avaliar a sua compra?", [
              { text: "Mais tarde", style: "cancel" },
              { text: "Avaliar", onPress: () => navigation.navigate("ClientReview", { orderId: id }) },
            ]);
          }
        },
      },
    ]);
  }

  async function sendPayment() {
    if (reference.trim().length < 3) {
      Alert.alert("Atenção", "Escreva a referência ou o número da operação.");
      return;
    }
    const ok = await run(
      () => declarePayment(id, { reference: reference.trim(), phone: phone.trim() || undefined }),
      "Não foi possível informar o pagamento."
    );
    if (ok) {
      setShowPay(false);
      setReference("");
      setPhone("");
      Alert.alert("Enviado", "O vendedor foi avisado e vai confirmar o pagamento.");
    }
  }

  if (!o) {
    return (
      <Page loader={loader}>
        <Title>Encomenda</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const st = ORDER_STATUS[o.status];
  const pay = PAY[o.paymentStatus];
  const ds = o.delivery ? DELIVERY_STATUS[o.delivery.status] : null;
  const track = o.tracking;
  const options: any[] = data.options?.payment ?? [];
  const paymentHint = options.find((x) => x.value === o.paymentMethod)?.hint;
  const cash = o.paymentMethod === "DINHEIRO";

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <Title>{o.number}</Title>
        <Badge label={st?.label ?? o.status} color={st?.color ?? "#757575"} />
      </View>
      <Text style={u.muted}>
        {formatDate(o.createdAt)} · {o.seller.name}
      </Text>

      <SubTitle>📍 Acompanhar encomenda</SubTitle>
      {track.cancelled ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>Encomenda cancelada.</Text>
        </Card>
      ) : (
        <Card>
          {track.steps.map((step: any, index: number) => {
            const done = index < track.current;
            const current = index === track.current;
            return (
              <View key={step.key} style={{ flexDirection: "row", alignItems: "center", marginTop: index === 0 ? 0 : 10 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    marginRight: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: done ? "#2E7D32" : current ? colors.primary : "#E0E0E0",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>{done ? "✓" : current ? "●" : ""}</Text>
                </View>
                <Text style={{ fontWeight: current ? "bold" : "normal", color: done || current ? undefined : colors.textSecondary }}>
                  {step.label}
                </Text>
              </View>
            );
          })}
          {trackingOn ? <Text style={[u.muted, { marginTop: 10 }]}>Esta tela atualiza sozinha a cada 30 segundos.</Text> : null}
        </Card>
      )}

      {o.delivery || o.desiredDate ? (
        <Card>
          {o.desiredDate ? <Text style={u.muted}>📅 Entrega pretendida: {formatDate(o.desiredDate)}</Text> : null}
          {o.delivery?.pickupAt ? <Text style={u.muted}>🕒 Recolha prevista: {formatDate(o.delivery.pickupAt)}</Text> : null}
          {ds ? (
            <View style={[u.row, { marginTop: 4 }]}>
              <Badge label={`Transporte: ${ds.label}`} color={ds.color} />
            </View>
          ) : null}

          {o.delivery && ["ACEITA", "RECOLHIDA", "EM_TRANSITO"].includes(o.delivery.status) ? (
            o.delivery.lastLocationAt ? (
              <View style={{ marginTop: 8 }}>
                <Text style={u.strong}>📍 {o.delivery.lastLocation || "Localização partilhada"}</Text>
                <Text style={u.muted}>Atualizado: {formatDateTime(o.delivery.lastLocationAt)}</Text>
                {o.delivery.lastLat !== null && o.delivery.lastLng !== null ? (
                  <Btn
                    small
                    kind="outline"
                    label="🗺️ Ver no mapa"
                    onPress={() => Linking.openURL(`https://www.google.com/maps?q=${o.delivery.lastLat},${o.delivery.lastLng}`)}
                  />
                ) : null}
              </View>
            ) : (
              <Text style={[u.muted, { marginTop: 8 }]}>O transportador ainda não partilhou a localização.</Text>
            )
          ) : null}

          {o.transporter ? (
            <View style={{ marginTop: 8 }}>
              <Text style={u.strong}>🚚 {o.transporter.name}</Text>
              <View style={u.row}>
                {o.transporter.phone ? (
                  <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${o.transporter.phone}`)} />
                ) : null}
                <Btn
                  small
                  kind="outline"
                  label="💬 Mensagem"
                  onPress={() => navigation.navigate("Chat", { userId: o.transporter.id, userName: o.transporter.name })}
                />
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      <View style={u.row}>
        <Btn small kind="outline" label="💬 Contactar vendedor" onPress={() => navigation.navigate("Chat", { userId: o.seller.id, userName: o.seller.name })} />
        {o.seller.phone ? <Btn small kind="outline" label="📞 Ligar ao vendedor" onPress={() => Linking.openURL(`tel:${o.seller.phone}`)} /> : null}
      </View>

      {o.actions.canConfirmReceipt ? <Btn label="✅ Confirmar recebimento" onPress={received} disabled={busy} /> : null}

      <SubTitle>Produtos</SubTitle>
      <Card>
        {o.items.map((i: any) => (
          <Text key={i.id} style={{ marginTop: 3 }}>
            {i.quantity} × {i.title} — {money(i.lineTotal)}
          </Text>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }}>
          <View style={u.between}>
            <Text>Subtotal</Text>
            <Text>{money(o.subtotal)}</Text>
          </View>
          <View style={u.between}>
            <Text>{o.isPickup ? "Recolha" : "Transporte"}</Text>
            <Text>{money(o.shipping)}</Text>
          </View>
          {!o.isPickup && !o.shippingAgreed ? <Text style={u.muted}>Estimativa. O preço final é acordado com o vendedor.</Text> : null}
          <View style={[u.between, { marginTop: 4 }]}>
            <Text style={{ fontWeight: "bold" }}>Total</Text>
            <Text style={{ fontWeight: "bold", color: colors.primary }}>{money(o.total)}</Text>
          </View>
        </View>
        {o.deliveryAddress ? <Text style={[u.muted, { marginTop: 8 }]}>📍 {o.deliveryAddress}</Text> : null}
        {o.notes ? <Text style={u.muted}>📝 {o.notes}</Text> : null}
      </Card>

      <SubTitle>💳 Pagamento</SubTitle>
      <Card>
        <View style={u.between}>
          <Text style={u.strong}>{o.paymentMethodLabel ?? "Método não escolhido"}</Text>
          <Badge label={pay?.label ?? o.paymentStatus} color={pay?.color ?? "#757575"} />
        </View>
        {paymentHint ? <Text style={[u.muted, { marginTop: 4 }]}>{paymentHint}</Text> : null}

        {o.declarations.map((d: any) => (
          <Text key={d.id} style={[u.muted, { marginTop: 4 }]}>
            Informado em {formatDate(d.createdAt)}: {money(d.amount)} (ref. {d.reference})
          </Text>
        ))}

        {o.actions.canChangeMethod ? (
          <>
            <Text style={[u.label, { marginTop: 10 }]}>Mudar método de pagamento</Text>
            <View style={u.row}>
              {options.map((x) => (
                <Chip
                  key={x.value}
                  label={x.label}
                  active={o.paymentMethod === x.value}
                  onPress={() => o.paymentMethod !== x.value && run(() => changeOrderPayment(id, x.value), "Não foi possível mudar o método.")}
                />
              ))}
            </View>
          </>
        ) : null}

        {o.actions.canPay ? (
          <>
            <Btn small label={showPay ? "Fechar" : "💳 Já paguei: informar pagamento"} onPress={() => setShowPay(!showPay)} />
            {showPay ? (
              <View>
                <Field label="Referência ou número da operação" value={reference} onChangeText={setReference} />
                <Field label="Telefone usado no pagamento (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Btn label={busy ? "A enviar..." : "Enviar ao vendedor"} onPress={sendPayment} disabled={busy} />
              </View>
            ) : null}
          </>
        ) : null}

        {cash && o.paymentStatus === "POR_PAGAR" ? (
          <Text style={[u.muted, { marginTop: 8 }]}>
            Pague em dinheiro ao vendedor. Ele marca o pedido como pago quando receber.
          </Text>
        ) : null}
      </Card>

      <View style={u.row}>
        {o.actions.hasReceipt ? <Btn small kind="outline" label="🧾 Ver recibo" onPress={() => navigation.navigate("ClientReceipt", { id })} /> : null}
        {o.actions.canReview ? <Btn small kind="outline" label="⭐ Avaliar" onPress={() => navigation.navigate("ClientReview", { orderId: id })} /> : null}
        <Btn small kind="outline" label="🆘 Problema com esta encomenda" onPress={() => navigation.navigate("Help")} />
        {o.actions.canCancel ? <Btn small kind="danger" label="Cancelar encomenda" onPress={cancel} disabled={busy} /> : null}
      </View>
    </Page>
  );
}
