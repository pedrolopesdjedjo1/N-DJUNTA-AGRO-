import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { listBoHighlights, removeBoHighlight } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = { max: 10, items: [] as any[] };

const OPEN_ROUTE: Record<string, [string, Record<string, any>]> = {
  PUBLICACAO: ["BoContentList", { kind: "PUBLICATION" }],
  CURSO: ["BoContentList", { kind: "LEARNING" }],
  EVENTO: ["BoEvents", {}],
};

// Destaques de publicações, cursos e eventos (os produtos têm a sua própria lista)
export default function BoHighlightsScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();
  const [kind, setKind] = useState<string>(route?.params?.kind ?? "PUBLICACAO");
  const loader = useLoader(() => listBoHighlights({ kind }), EMPTY, [kind]);
  const d: any = loader.data;
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    if (route?.params?.kind) setKind(route.params.kind);
  }, [route?.params?.kind]);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind])
  );

  function remove(h: any) {
    Alert.alert("Tirar do destaque", `"${h.title}" deixa de aparecer em destaque.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Tirar",
        onPress: async () => {
          setBusyId(h.id);
          try {
            await removeBoHighlight(h.id);
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

  const openRoute = OPEN_ROUTE[kind];

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <Title>⭐ Destaques</Title>
        <Text style={u.muted}>O que aparece primeiro na página inicial. {d.items.length} de {d.max} destaques deste tipo.</Text>

        <View style={u.row}>
          {catalog.highlightKinds.map((k) => (
            <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="🛍️ Produtos em destaque" onPress={() => navigation.navigate("BoFeatured")} />
          {openRoute ? <Btn small kind="outline" label="➕ Escolher um para destacar" onPress={() => navigation.navigate(openRoute[0], openRoute[1])} /> : null}
        </View>

        {d.items.length === 0 && !loader.loading ? (
          <Empty text="Ainda não há destaques deste tipo. Abra a lista e toque em 'Pôr em destaque'." />
        ) : (
          d.items.map((h: any) => (
            <Card key={h.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  ⭐ {h.title}
                </Text>
                {h.missing ? <Badge label="Conteúdo removido" color="#C62828" /> : null}
              </View>
              <Text style={u.muted}>Em destaque até {formatDate(h.endsAt)}</Text>
              <Btn small kind="outline" label={busyId === h.id ? "..." : "Tirar do destaque"} onPress={() => remove(h)} disabled={busyId === h.id} />
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
