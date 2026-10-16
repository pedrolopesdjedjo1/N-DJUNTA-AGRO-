import React from "react";
import { View, Text, Image, Alert } from "react-native";
import { ClientLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { getCart, setCartQuantity, removeFromCart, clearCart } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  destination: { addressId: null, region: "" },
  groups: [] as any[],
  itemCount: 0,
  subtotal: 0,
  shippingKnownTotal: 0,
  shippingUnknownGroups: 0,
  hasProblems: false,
};

export default function ClientCartScreen({ navigation }: any) {
  const loader = useLoader(() => getCart(), EMPTY);
  const cart: any = loader.data;

  async function change(productId: string, quantity: number) {
    try {
      loader.setData(await setCartQuantity(productId, quantity));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível alterar a quantidade."));
    }
  }

  async function remove(productId: string) {
    try {
      loader.setData(await removeFromCart(productId));
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível remover."));
    }
  }

  function empty() {
    Alert.alert("Esvaziar carrinho", "Remover todos os produtos do carrinho?", [
      { text: "Não", style: "cancel" },
      {
        text: "Esvaziar",
        style: "destructive",
        onPress: async () => {
          try {
            loader.setData(await clearCart());
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível esvaziar."));
          }
        },
      },
    ]);
  }

  const total = cart.subtotal + cart.shippingKnownTotal;

  return (
    <ClientLayout active="ClientCart">
      <Page loader={loader}>
        <Title>🛒 Carrinho</Title>

        {cart.groups.length === 0 ? (
          <>
            <Empty text="O seu carrinho está vazio." />
            <Btn label="🔎 Explorar produtos" onPress={() => navigation.navigate("ClientExplore")} />
          </>
        ) : (
          <>
            <Text style={u.muted}>
              📍 {cart.destination.region ? `Entrega em ${cart.destination.region}` : "Sem localização definida"}
            </Text>
            <Btn small kind="outline" label="Mudar endereço" onPress={() => navigation.navigate("ClientAddresses")} />

            {cart.groups.map((g: any) => (
              <Card key={g.sellerId ?? "unavailable"}>
                <Text style={u.strong}>
                  {g.seller ? `${g.seller.name} ${g.seller.isVerified ? "✅" : ""}` : "Produtos indisponíveis"}
                </Text>
                {g.seller?.location ? <Text style={u.muted}>📍 {g.seller.location}</Text> : null}

                {g.items.map((item: any) => (
                  <View key={item.productId} style={{ marginTop: 12 }}>
                    <View style={u.row}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={u.photo} /> : <View style={u.photo} />}
                      <View style={{ flex: 1 }}>
                        <Text style={u.strong} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={u.muted}>
                          {money(item.price)} / {item.unit}
                        </Text>
                        {!item.problem ? <Text style={u.strong}>{money(item.lineTotal)}</Text> : null}
                      </View>
                    </View>

                    {item.problem ? (
                      <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ {item.problem}</Text>
                    ) : null}

                    <View style={[u.row, { alignItems: "center" }]}>
                      {!item.problem || item.available > 0 ? (
                        <>
                          <Btn small kind="outline" label="−" onPress={() => change(item.productId, item.quantity - 1)} />
                          <Text style={{ fontSize: 16, fontWeight: "bold", marginHorizontal: 12 }}>{item.quantity}</Text>
                          <Btn
                            small
                            kind="outline"
                            label="+"
                            onPress={() => change(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.available}
                          />
                        </>
                      ) : null}
                      <Btn small kind="danger" label="Remover" onPress={() => remove(item.productId)} />
                    </View>
                  </View>
                ))}

                {g.seller ? (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                    <Text>Subtotal: {money(g.subtotal)}</Text>
                    <Text style={u.muted}>
                      🚚 Transporte (estimativa):{" "}
                      {g.shippingEstimate.amount !== null ? money(g.shippingEstimate.amount) : "a combinar com o vendedor"}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))}

            <SubTitle>Resumo</SubTitle>
            <Card>
              <View style={u.between}>
                <Text>Subtotal</Text>
                <Text style={u.strong}>{money(cart.subtotal)}</Text>
              </View>
              <View style={[u.between, { marginTop: 4 }]}>
                <Text>Transporte (se escolher entrega)</Text>
                <Text style={u.strong}>{money(cart.shippingKnownTotal)}</Text>
              </View>
              {cart.shippingUnknownGroups > 0 ? (
                <Text style={u.muted}>+ transporte a combinar com {cart.shippingUnknownGroups} vendedor(es)</Text>
              ) : null}
              <View style={[u.between, { marginTop: 8 }]}>
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>Total</Text>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{money(total)}</Text>
              </View>
              <Text style={[u.muted, { marginTop: 6 }]}>
                Se escolher recolher no vendedor, não paga transporte.
              </Text>
            </Card>

            {cart.hasProblems ? (
              <Text style={{ color: "#C62828", marginTop: 8 }}>
                Alguns produtos têm problemas. Ajuste a quantidade ou remova-os para continuar.
              </Text>
            ) : null}

            <Btn label="FAZER ENCOMENDA" onPress={() => navigation.navigate("ClientCheckout")} disabled={cart.hasProblems} />
            <Btn kind="outline" label="Continuar a comprar" onPress={() => navigation.navigate("ClientExplore")} />
            <Btn small kind="danger" label="Esvaziar carrinho" onPress={empty} />
          </>
        )}
      </Page>
    </ClientLayout>
  );
}
