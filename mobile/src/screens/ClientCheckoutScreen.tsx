import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getCart, getAddresses, getCheckoutOptions, getPaymentMethods, placeOrder } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  cart: { destination: { addressId: null, region: "" }, groups: [] as any[], itemCount: 0 } as any,
  addresses: [] as any[],
  options: { payment: [] as any[], delivery: [] as any[], note: "" } as any,
  methods: [] as any[],
};

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const LABELS: Record<string, string> = { CASA: "Casa", TRABALHO: "Trabalho", OUTRO: "Outro" };

export default function ClientCheckoutScreen({ navigation, route }: any) {
  const selectedIds: string[] | undefined = route?.params?.productIds;

  const [addressId, setAddressId] = useState("");
  const [regionText, setRegionText] = useState("");
  const [appliedRegion, setAppliedRegion] = useState("");

  const loader = useLoader(
    async () => {
      const [cart, addresses, options, methods] = await Promise.all([
        getCart({ addressId: addressId || undefined, region: appliedRegion || undefined }),
        getAddresses(),
        getCheckoutOptions(),
        getPaymentMethods().catch(() => []),
      ]);
      return { cart, addresses, options, methods };
    },
    EMPTY,
    [addressId, appliedRegion]
  );

  const { cart, addresses, options, methods } = loader.data as any;

  const [method, setMethod] = useState<"ENTREGA" | "RECOLHA">("ENTREGA");
  const [payment, setPayment] = useState("");
  const [typedAddress, setTypedAddress] = useState("");
  const [desired, setDesired] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  // Usa o método de pagamento principal guardado no perfil, se existir
  useEffect(() => {
    if (loader.loading || payment) return;
    const preferred = (methods as any[]).find((m) => m.isDefault);
    if (preferred) setPayment(preferred.kind);
  }, [loader.loading]);

  const chosenAddressId: string = addressId || (addresses as any[]).find((a) => a.isDefault)?.id || "";
  const delivery = method === "ENTREGA";

  const groups: any[] = (cart.groups as any[])
    .map((g) => ({ ...g, items: g.items.filter((i: any) => !selectedIds || selectedIds.includes(i.productId)) }))
    .filter((g) => g.items.length > 0);

  const subtotal = groups.reduce((s, g) => s + g.items.reduce((a: number, i: any) => a + i.lineTotal, 0), 0);
  const shippingKnown = delivery
    ? groups.reduce((s, g) => s + (g.seller && g.shippingEstimate.amount !== null ? g.shippingEstimate.amount : 0), 0)
    : 0;
  const shippingUnknown = delivery ? groups.filter((g) => g.seller && g.shippingEstimate.amount === null).length : 0;
  const total = subtotal + shippingKnown;
  const hasProblems = groups.some((g) => g.items.some((i: any) => i.problem));

  const paymentInfo = (options.payment as any[]).find((o) => o.value === payment);

  async function confirm() {
    if (groups.length === 0) {
      Alert.alert("Atenção", "Não há produtos para encomendar.");
      return;
    }
    if (hasProblems) {
      Alert.alert("Atenção", "Volte ao carrinho: alguns produtos têm problemas.");
      return;
    }
    if (!payment) {
      Alert.alert("Atenção", "Escolha o método de pagamento.");
      return;
    }
    if (delivery && !chosenAddressId && !typedAddress.trim()) {
      Alert.alert("Atenção", "Escolha ou escreva o endereço de entrega.");
      return;
    }
    if (desired.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(desired.trim())) {
      Alert.alert("Atenção", "Escreva a data assim: AAAA-MM-DD (ex: 2026-10-20) ou escolha uma das opções.");
      return;
    }

    setSending(true);
    try {
      const result = await placeOrder({
        deliveryMethod: method,
        paymentMethod: payment,
        addressId: delivery && chosenAddressId ? chosenAddressId : undefined,
        deliveryAddress: delivery && !chosenAddressId ? typedAddress.trim() : undefined,
        region: delivery && !chosenAddressId ? appliedRegion || undefined : undefined,
        desiredDate: desired.trim() ? new Date(`${desired.trim()}T12:00:00`).toISOString() : undefined,
        notes: notes.trim() || undefined,
        productIds: selectedIds,
      });

      Alert.alert(
        "Encomenda enviada",
        `${result.orders.length} pedido(s) enviado(s) aos vendedores.\nTotal: ${money(result.total)}${
          shippingUnknown > 0 ? "\n(transporte a combinar com o vendedor)" : ""
        }`,
        [{ text: "Ver as minhas encomendas", onPress: () => navigation.navigate("ClientOrders") }]
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar a encomenda."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>🛒 Minha encomenda</Title>

      {groups.length === 0 ? (
        <>
          <Empty text="Não há produtos para encomendar." />
          <Btn label="Ir ao carrinho" onPress={() => navigation.navigate("ClientCart")} />
        </>
      ) : (
        <>
          {groups.map((g) => (
            <Card key={g.sellerId ?? "x"}>
              <Text style={u.strong}>{g.seller ? g.seller.name : "Produtos indisponíveis"}</Text>
              {g.items.map((i: any) => (
                <View key={i.productId} style={{ marginTop: 6 }}>
                  <Text>
                    {i.quantity} {i.unit} de {i.title} — {i.problem ? "indisponível" : money(i.lineTotal)}
                  </Text>
                  {i.problem ? <Text style={{ color: "#C62828" }}>⚠️ {i.problem}</Text> : null}
                </View>
              ))}
            </Card>
          ))}

          <SubTitle>Método de entrega</SubTitle>
          <View style={u.row}>
            <Chip label="🚚 Entrega ao domicílio" active={delivery} onPress={() => setMethod("ENTREGA")} />
            <Chip label="🏪 Recolher no vendedor" active={!delivery} onPress={() => setMethod("RECOLHA")} />
          </View>

          {delivery ? (
            <>
              <SubTitle>Endereço de entrega</SubTitle>
              {(addresses as any[]).length > 0 ? (
                <>
                  {(addresses as any[]).map((a) => {
                    const selected = a.id === chosenAddressId;
                    return (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => setAddressId(a.id)}
                        style={{
                          borderWidth: 2,
                          borderColor: selected ? colors.primary : colors.border,
                          borderRadius: 10,
                          padding: 10,
                          marginTop: 8,
                        }}
                      >
                        <Text style={u.strong}>
                          {selected ? "✓ " : ""}
                          {a.name || LABELS[a.label] || "Endereço"}
                          {a.isDefault ? " (principal)" : ""}
                        </Text>
                        <Text>{a.address}</Text>
                        {a.region ? <Text style={u.muted}>📍 {a.region}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                  <Btn small kind="outline" label="Gerir endereços" onPress={() => navigation.navigate("ClientAddresses")} />
                </>
              ) : (
                <>
                  <Field label="Endereço ou local de entrega" value={typedAddress} onChangeText={setTypedAddress} multiline placeholder="Ex: Bairro de Pefine, perto do mercado" />
                  <Field label="Região (para calcular o transporte)" value={regionText} onChangeText={setRegionText} placeholder="Ex: Bissau" />
                  <Btn small kind="outline" label="Calcular transporte" onPress={() => setAppliedRegion(regionText.trim())} />
                  <Btn small kind="outline" label="Guardar endereços para a próxima vez" onPress={() => navigation.navigate("ClientAddresses")} />
                </>
              )}
            </>
          ) : (
            <Text style={u.muted}>Combine com o vendedor o local e a hora para levantar a encomenda.</Text>
          )}

          <SubTitle>Data de entrega (opcional)</SubTitle>
          <View style={u.row}>
            <Chip label="Hoje" active={desired === dateOffset(0)} onPress={() => setDesired(dateOffset(0))} />
            <Chip label="Amanhã" active={desired === dateOffset(1)} onPress={() => setDesired(dateOffset(1))} />
            <Chip label="Em 3 dias" active={desired === dateOffset(3)} onPress={() => setDesired(dateOffset(3))} />
            <Chip label="Em 7 dias" active={desired === dateOffset(7)} onPress={() => setDesired(dateOffset(7))} />
          </View>
          <Field label="Ou escreva a data (AAAA-MM-DD)" value={desired} onChangeText={setDesired} placeholder="2026-10-20" />

          <Field label="Observações (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="Ex: ligar antes de chegar" />

          <SubTitle>Método de pagamento</SubTitle>
          <View style={u.row}>
            {(options.payment as any[]).map((o) => (
              <Chip key={o.value} label={o.label} active={payment === o.value} onPress={() => setPayment(o.value)} />
            ))}
          </View>
          {paymentInfo ? <Text style={[u.muted, { marginTop: 6 }]}>{paymentInfo.hint}</Text> : null}
          {options.note ? <Text style={u.muted}>{options.note}</Text> : null}

          <SubTitle>Resumo</SubTitle>
          <Card>
            <View style={u.between}>
              <Text>Produtos</Text>
              <Text style={u.strong}>{money(subtotal)}</Text>
            </View>
            <View style={[u.between, { marginTop: 4 }]}>
              <Text>{delivery ? "🚚 Entrega" : "🏪 Recolha"}</Text>
              <Text style={u.strong}>{money(shippingKnown)}</Text>
            </View>
            {shippingUnknown > 0 ? (
              <Text style={u.muted}>+ transporte a combinar com {shippingUnknown} vendedor(es). O preço final fica acordado com o vendedor.</Text>
            ) : null}
            <View style={[u.between, { marginTop: 8 }]}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{money(total)}</Text>
            </View>
          </Card>

          <Btn label={sending ? "A enviar..." : "CONFIRMAR ENCOMENDA"} onPress={confirm} disabled={sending || hasProblems} />
          <Btn kind="outline" label="Voltar ao carrinho" onPress={() => navigation.navigate("ClientCart")} />
        </>
      )}
    </Page>
  );
}
