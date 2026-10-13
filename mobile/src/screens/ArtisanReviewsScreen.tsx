import React, { useState } from "react";
import { View, Text } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getArtisanReviews } from "../api/artisan";
import { getCustomers } from "../api/merchant";
import { formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  reviews: { average: 0, count: 0, received: [] as any[], given: [] as any[] },
  customers: [] as any[],
};

function stars(n: number) {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function ArtisanReviewsScreen({ navigation }: any) {
  const loader = useLoader(
    async () => {
      const [reviews, customers] = await Promise.all([getArtisanReviews(), getCustomers()]);
      return { reviews, customers };
    },
    EMPTY
  );
  const [tab, setTab] = useState<"received" | "given">("received");

  const { reviews, customers } = loader.data;
  const list: any[] = tab === "received" ? reviews.received : reviews.given;

  return (
    <Page loader={loader}>
      <Title>⭐ Avaliações</Title>

      <Card>
        <Text style={{ fontSize: 34, fontWeight: "bold", color: colors.primary }}>
          {Number(reviews.average).toFixed(1)}
        </Text>
        <Text style={{ fontSize: 20, color: "#F9A825" }}>{stars(reviews.average)}</Text>
        <Text style={u.muted}>Nota média · {reviews.count} avaliação(ões) recebida(s)</Text>
      </Card>

      <View style={u.row}>
        <Chip label="Recebidas" active={tab === "received"} onPress={() => setTab("received")} />
        <Chip label="Histórico das que fiz" active={tab === "given"} onPress={() => setTab("given")} />
      </View>

      {list.length === 0 ? (
        <Empty text={tab === "received" ? "Ainda não recebeu avaliações." : "Ainda não avaliou ninguém."} />
      ) : (
        list.map((r) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={u.strong}>{tab === "received" ? r.authorName : r.targetName}</Text>
              <Text style={{ color: "#F9A825" }}>{stars(r.rating)}</Text>
            </View>
            <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
            {r.comment ? <Text style={{ marginTop: 6 }}>{r.comment}</Text> : <Text style={u.muted}>Sem comentário.</Text>}
          </Card>
        ))
      )}

      <SubTitle>Avaliar comprador</SubTitle>
      {customers.length === 0 ? (
        <Empty text="Ainda não tem compradores." />
      ) : (
        customers.map((c: any) => (
          <Card key={c.id}>
            <View style={u.between}>
              <Text style={u.strong}>{c.name}</Text>
              <Text style={u.muted}>{c.orders} pedido(s)</Text>
            </View>
            <Btn small kind="outline" label="⭐ Avaliar" onPress={() => navigation.navigate("Reviews", { userId: c.id, userName: c.name })} />
          </Card>
        ))
      )}
    </Page>
  );
}
