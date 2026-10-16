import React from "react";
import { View, Text, Share, Alert } from "react-native";
import { Page, Title, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { getReceipt } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const PAY: Record<string, string> = {
  PAGO: "Pago",
  AGUARDA_CONFIRMACAO: "A aguardar confirmação do vendedor",
  POR_PAGAR: "Por pagar",
};

export default function ClientReceiptScreen({ route }: any) {
  const id: string = route?.params?.id;
  const loader = useLoader(() => getReceipt(id), null as any, [id]);
  const r: any = loader.data;

  async function share() {
    try {
      await Share.share({ message: r.text });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar o recibo."));
    }
  }

  if (!r) {
    return (
      <Page loader={loader}>
        <Title>🧾 Recibo</Title>
        <Empty text="O recibo fica disponível depois do pagamento ou da entrega." />
      </Page>
    );
  }

  return (
    <Page loader={loader}>
      <Title>🧾 Recibo</Title>

      <Card>
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>NÔDJUNTA AGRO</Text>
        <Text style={u.muted}>Nº {r.number}</Text>
        <Text style={u.muted}>Encomenda de {formatDate(r.createdAt)}</Text>
        <Text style={u.muted}>Emitido em {formatDate(r.issuedAt)}</Text>

        <View style={{ marginTop: 10 }}>
          <Text style={u.strong}>Cliente</Text>
          <Text>
            {r.buyer?.name ?? ""}
            {r.buyer?.phone ? ` · ${r.buyer.phone}` : ""}
          </Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={u.strong}>Vendedor</Text>
          <Text>
            {r.seller?.name ?? ""}
            {r.seller?.phone ? ` · ${r.seller.phone}` : ""}
          </Text>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 10 }}>
          {r.items.map((i: any) => (
            <View key={i.id} style={[u.between, { marginTop: 4 }]}>
              <Text style={{ flex: 1, marginRight: 8 }}>
                {i.quantity} × {i.title}
              </Text>
              <Text>{money(i.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 }}>
          <View style={u.between}>
            <Text>Subtotal</Text>
            <Text>{money(r.subtotal)}</Text>
          </View>
          <View style={u.between}>
            <Text>{r.isPickup ? "Recolha" : "Entrega"}</Text>
            <Text>{money(r.shipping)}</Text>
          </View>
          <View style={[u.between, { marginTop: 6 }]}>
            <Text style={{ fontWeight: "bold", fontSize: 16 }}>TOTAL</Text>
            <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.primary }}>{money(r.total)}</Text>
          </View>
        </View>

        <Text style={[u.muted, { marginTop: 10 }]}>
          Pagamento: {r.paymentMethodLabel ?? "—"} ({PAY[r.paymentStatus] ?? r.paymentStatus})
        </Text>
        {r.deliveryAddress ? <Text style={u.muted}>📍 {r.deliveryAddress}</Text> : null}
      </Card>

      <Btn label="📤 Partilhar recibo" onPress={share} />
    </Page>
  );
}
