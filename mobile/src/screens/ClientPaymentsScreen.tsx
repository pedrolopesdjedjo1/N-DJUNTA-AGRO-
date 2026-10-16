import React from "react";
import { View, Text } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getMyPayments } from "../api/shop";
import { money, formatDate } from "../constants/market";

const PAY: Record<string, { label: string; color: string }> = {
  PAGO: { label: "Pago", color: "#2E7D32" },
  AGUARDA_CONFIRMACAO: { label: "A aguardar confirmação", color: "#F9A825" },
  POR_PAGAR: { label: "Por pagar", color: "#757575" },
};

const EMPTY = { pending: [] as any[], history: [] as any[], totalPaid: 0 };

export default function ClientPaymentsScreen({ navigation }: any) {
  const loader = useLoader(getMyPayments, EMPTY);
  const d: any = loader.data;

  function card(p: any) {
    const pay = PAY[p.paymentStatus];
    return (
      <Card key={p.orderId}>
        <View style={u.between}>
          <Text style={u.strong}>{p.number}</Text>
          <Badge label={pay?.label ?? p.paymentStatus} color={pay?.color ?? "#757575"} />
        </View>
        <Text style={u.muted}>
          {formatDate(p.createdAt)} · {p.seller.name}
        </Text>
        <Text style={[u.strong, { marginTop: 6 }]}>{money(p.total)}</Text>
        <Text style={u.muted}>{p.paymentMethodLabel ?? "Método não escolhido"}</Text>
        {p.declarations.map((x: any) => (
          <Text key={x.id} style={u.muted}>
            Informado em {formatDate(x.createdAt)} (ref. {x.reference})
          </Text>
        ))}

        <View style={u.row}>
          <Btn small label="Ver encomenda" onPress={() => navigation.navigate("ClientOrder", { id: p.orderId })} />
          {p.canPay ? <Btn small kind="outline" label="💳 Informar pagamento" onPress={() => navigation.navigate("ClientOrder", { id: p.orderId })} /> : null}
          {p.hasReceipt ? <Btn small kind="outline" label="🧾 Recibo" onPress={() => navigation.navigate("ClientReceipt", { id: p.orderId })} /> : null}
        </View>
      </Card>
    );
  }

  return (
    <Page loader={loader}>
      <Title>💳 Pagamentos</Title>

      <Card>
        <Text style={u.muted}>Total pago até hoje</Text>
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>{money(d.totalPaid)}</Text>
      </Card>

      <SubTitle>Por pagar</SubTitle>
      {d.pending.length === 0 ? <Empty text="Não tem pagamentos pendentes." /> : d.pending.map(card)}

      <SubTitle>Histórico de pagamentos</SubTitle>
      {d.history.length === 0 ? <Empty text="Ainda não tem pagamentos concluídos." /> : d.history.map(card)}
    </Page>
  );
}
