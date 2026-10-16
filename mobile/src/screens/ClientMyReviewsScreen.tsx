import React from "react";
import { View, Text, Image } from "react-native";
import { Page, Title, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { getMyReviews } from "../api/shop";
import { formatDate } from "../constants/market";

const KIND_LABEL: Record<string, string> = {
  PRODUTO: "Produto",
  VENDEDOR: "Vendedor",
  TRANSPORTADOR: "Transportador",
};

export default function ClientMyReviewsScreen({ navigation }: any) {
  const loader = useLoader(getMyReviews, [] as any[]);
  const reviews: any[] = loader.data;

  return (
    <Page loader={loader}>
      <Title>⭐ Minhas avaliações</Title>

      {reviews.length === 0 ? (
        <>
          <Empty text="Ainda não avaliou nenhuma compra. Depois de receber uma encomenda, avalie o produto, o vendedor e o transportador." />
          <Btn label="Ver as minhas encomendas" onPress={() => navigation.navigate("ClientOrders")} />
        </>
      ) : (
        reviews.map((r) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {KIND_LABEL[r.kind] ?? r.kind}: {r.productTitle ?? r.targetName}
              </Text>
              <Text style={{ color: "#F9A825" }}>{"★".repeat(r.rating)}</Text>
            </View>
            {r.productTitle ? <Text style={u.muted}>Vendedor: {r.targetName}</Text> : null}
            <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
            {r.comment ? <Text style={{ marginTop: 4 }}>{r.comment}</Text> : null}
            {r.imageUrl ? <Image source={{ uri: r.imageUrl }} style={{ width: 100, height: 100, borderRadius: 8, marginTop: 6 }} /> : null}
            <Btn small kind="outline" label="Ver encomenda" onPress={() => navigation.navigate("ClientOrder", { id: r.orderId })} />
          </Card>
        ))
      )}
    </Page>
  );
}
