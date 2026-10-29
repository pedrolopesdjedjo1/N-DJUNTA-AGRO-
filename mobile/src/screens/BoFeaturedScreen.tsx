import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import BoProductCard from "../components/admin/BoProductCard";
import { Page, Title, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { listBoFeatured, unfeatureBoProduct } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = { max: 20, items: [] as any[] };

// Produtos em destaque: os que aparecem primeiro nas listas e na página inicial
export default function BoFeaturedScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const loader = useLoader(listBoFeatured, EMPTY);
  const d: any = loader.data;
  const [busyId, setBusyId] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function remove(productId: string, title: string) {
    Alert.alert("Tirar do destaque", `"${title}" deixa de aparecer em destaque.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Tirar",
        onPress: async () => {
          setBusyId(productId);
          try {
            await unfeatureBoProduct(productId);
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível tirar do destaque."));
          } finally {
            setBusyId("");
          }
        },
      },
    ]);
  }

  return (
    <AdminLayout active="BoMarket">
      <Page loader={loader}>
        <Title>⭐ Produtos em destaque</Title>
        <Text style={u.muted}>
          {d.items.length} de {d.max} destaques ativos. Para destacar um produto, abra-o e toque em "Destacar".
        </Text>

        {d.items.length === 0 && !loader.loading ? (
          <Empty text="Ainda não há produtos em destaque." />
        ) : (
          d.items.map((x: any) => (
            <View key={x.highlightId}>
              <BoProductCard item={x.product} qualityFlags={catalog.qualityFlags} onPress={() => navigation.navigate("BoProduct", { id: x.product.id })} />
              <Card>
                <Text style={u.muted}>⭐ Em destaque até {formatDate(x.endsAt)}</Text>
                {adminCan("market.moderate") ? (
                  <Btn small kind="outline" label={busyId === x.product.id ? "..." : "Tirar do destaque"} onPress={() => remove(x.product.id, x.product.title)} disabled={busyId === x.product.id} />
                ) : null}
              </Card>
            </View>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
