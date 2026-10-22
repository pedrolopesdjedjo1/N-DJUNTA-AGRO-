import React, { useCallback } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getPlace, setPlaceStatus, deletePlace } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { PLACE_KIND_ICON, PLACE_STATUS_COLOR } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";

export default function GovPlaceScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useGovCatalog();
  const loader = useLoader(() => getPlace(id), null as any, [id]);
  const p: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!p) {
    return (
      <Page loader={loader}>
        <Title>Local</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const hasCoords = p.lat !== null && p.lng !== null && p.lat !== undefined;

  async function changeStatus(next: string) {
    if (next === p.status) return;
    try {
      loader.setData(await setPlaceStatus(id, next));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar o estado."));
    }
  }

  function remove() {
    Alert.alert("Apagar local", `Apagar "${p.name}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePlace(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>
            {PLACE_KIND_ICON[p.kind] ?? "📍"} {p.name}
          </Title>
        </View>
        <Badge label={labelOf(catalog.placeStatus, p.status)} color={PLACE_STATUS_COLOR[p.status] ?? "#757575"} />
      </View>
      <Text style={u.muted}>
        {labelOf(catalog.placeKinds, p.kind)} · {labelOf(catalog.placeSubtypes[p.kind] ?? [], p.subtype)}
      </Text>

      {p.status === "DANIFICADA" ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>⚠️ Este local está danificado.</Text>
        </Card>
      ) : null}

      <Card>
        <Text>📍 {[p.address, p.region].filter(Boolean).join(", ")}</Text>
        {p.schedule ? <Text style={u.muted}>🕒 {p.schedule}</Text> : null}
        {p.phone ? <Text style={u.muted}>📞 {p.phone}</Text> : null}
        {p.capacity ? <Text style={u.muted}>📦 {p.capacity}</Text> : null}
        {p.products?.length > 0 ? <Text style={u.muted}>🧺 {p.products.join(", ")}</Text> : null}
        <Text style={[u.muted, { marginTop: 4 }]}>
          {p.organization?.name ?? "Instituição"} {p.organization?.isVerified ? "✅" : ""}
        </Text>
        <View style={u.row}>
          {hasCoords ? <Btn small label="🗺️ Como chegar" onPress={() => Linking.openURL(`https://www.google.com/maps?q=${p.lat},${p.lng}`)} /> : null}
          {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
        </View>
      </Card>

      {p.description ? (
        <>
          <SubTitle>Sobre este local</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.description}</Text>
        </>
      ) : null}

      {!p.isMine ? (
        <View style={u.row}>
          <Btn
            small
            kind="outline"
            label="🏗️ Comunicar um problema neste local"
            onPress={() =>
              navigation.navigate("GovReportForm", {
                category: "INFRAESTRUTURA",
                placeId: p.id,
                placeName: p.name,
                institutionId: p.ownerId,
                institutionName: p.organization?.name,
                region: p.region,
              })
            }
          />
        </View>
      ) : (
        <>
          <SubTitle>Estado do local</SubTitle>
          <View style={u.row}>
            {catalog.placeStatus.map((s) => (
              <Btn key={s.value} small kind={p.status === s.value ? "primary" : "outline"} label={s.label} onPress={() => changeStatus(s.value)} />
            ))}
          </View>

          <View style={u.row}>
            <Btn small label="✏️ Editar" onPress={() => navigation.navigate("GovPlaceForm", { place: p })} />
            <Btn small kind="danger" label="Apagar" onPress={remove} />
          </View>
          {p.isPublic === false ? <Text style={u.muted}>🔒 Este local é privado: só a sua instituição o vê.</Text> : null}
        </>
      )}
    </Page>
  );
}
