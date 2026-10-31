import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { listBoBanners, updateBoBanner, deleteBoBanner } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { BANNER_STATE } from "../constants/backofficeOrgs";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = { counts: {} as Record<string, number>, max: 10, items: [] as any[] };

function payload(b: any, isActive: boolean) {
  return {
    title: b.title,
    body: b.body,
    imageUrl: b.imageUrl,
    linkKind: b.linkKind,
    linkTarget: b.linkTarget,
    audiences: b.audiences,
    regionKeys: b.regionKeys,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    sortOrder: b.sortOrder,
    isActive,
  };
}

// Banners da página inicial
export default function BoBannersScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [state, setState] = useState("");
  const loader = useLoader(() => listBoBanners({ status: state }), EMPTY, [state]);
  const d: any = loader.data;
  const [busyId, setBusyId] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function toggle(b: any) {
    setBusyId(b.id);
    try {
      await updateBoBanner(b.id, payload(b, !b.isActive));
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar o banner."));
    } finally {
      setBusyId("");
    }
  }

  function remove(b: any) {
    Alert.alert("Apagar banner", `Apagar "${b.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBoBanner(b.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const active = d.counts.ACTIVE ?? 0;

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <Title>🖼️ Banners</Title>
        <Text style={u.muted}>Avisos com imagem que aparecem na página inicial das pessoas. Pode escolher o público, as regiões e as datas. Máximo de {d.max} ativos.</Text>

        <Btn label="➕ Novo banner" onPress={() => navigation.navigate("BoBannerForm")} disabled={active >= d.max} />
        {active >= d.max ? <Text style={{ color: "#EF6C00" }}>Já há {d.max} banners ativos. Termine ou desligue algum antes de criar outro.</Text> : null}

        <View style={u.row}>
          <Chip label="Todos" active={state === ""} onPress={() => setState("")} />
          {Object.keys(BANNER_STATE).map((k) => (
            <Chip key={k} label={`${BANNER_STATE[k].label} (${d.counts[k] ?? 0})`} active={state === k} onPress={() => setState(k)} />
          ))}
        </View>

        {d.items.length === 0 && !loader.loading ? (
          <Empty text="Ainda não há banners." />
        ) : (
          d.items.map((b: any) => (
            <Card key={b.id}>
              {b.imageUrl ? <Image source={{ uri: b.imageUrl }} resizeMode="cover" style={{ width: "100%", height: 120, borderRadius: 8, marginBottom: 8, backgroundColor: "#ECEFF1" }} /> : null}
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{b.title}</Text>
                <Badge label={BANNER_STATE[b.state]?.label ?? b.state} color={BANNER_STATE[b.state]?.color ?? "#757575"} />
              </View>
              {b.body ? <Text style={{ marginTop: 2 }}>{b.body}</Text> : null}
              <Text style={u.muted}>
                {formatDate(b.startsAt)} → {formatDate(b.endsAt)} · ordem {b.sortOrder}
              </Text>
              <Text style={u.muted}>
                Público: {b.audiences.length === 0 ? "todos" : b.audiences.map((a: string) => labelOf(catalog.audiences, a) || a).join(", ")}
              </Text>
              <Text style={u.muted}>Regiões: {b.regions.length === 0 ? "todas" : b.regions.join(", ")}</Text>
              {b.linkKind !== "NONE" ? <Text style={u.muted}>🔗 {labelOf(catalog.bannerLinks, b.linkKind)}: {b.linkTarget}</Text> : null}

              <View style={u.row}>
                <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("BoBannerForm", { banner: b })} />
                {b.state !== "ENDED" ? (
                  <Btn small kind="outline" label={busyId === b.id ? "..." : b.isActive ? "Desligar" : "Ligar"} onPress={() => toggle(b)} disabled={busyId === b.id} />
                ) : null}
                <Btn small kind="danger" label="Apagar" onPress={() => remove(b)} />
              </View>
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
