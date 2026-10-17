import React, { useCallback } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import NeedCard from "../components/ngo/NeedCard";
import { listCommunities, listNeeds, listBeneficiaries, deleteCommunity } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

export default function NgoCommunityScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();

  const loader = useLoader(
    async () => {
      const [communities, needs, beneficiaries] = await Promise.all([
        listCommunities(),
        listNeeds({ communityId: id }),
        listBeneficiaries({ communityId: id, limit: 8 }),
      ]);
      const community = (communities as any[]).find((c) => c.id === id);
      if (!community) {
        throw new Error("Comunidade não encontrada.");
      }
      return { community, needs, beneficiaries };
    },
    null as any,
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  const d: any = loader.data;
  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Comunidade</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const c = d.community;
  const needs: any[] = d.needs;
  const open = needs.filter((n) => n.status !== "ATENDIDA");
  const served = needs.filter((n) => n.status === "ATENDIDA");
  const hasCoords = c.lat !== null && c.lng !== null && c.lat !== undefined;

  function remove() {
    Alert.alert(
      "Apagar comunidade",
      "As necessidades desta comunidade são apagadas. Os beneficiários ficam guardados, mas sem ligação à comunidade. Apagar?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCommunity(id);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar a comunidade."));
            }
          },
        },
      ]
    );
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{c.name}</Title>
        </View>
        <Badge label={labelOf(catalog.communityTypes, c.type)} color="#00838F" />
      </View>

      <Card>
        <Text>📍 {c.region}</Text>
        {c.population ? <Text style={u.muted}>👥 {formatNumber(c.population)} habitantes</Text> : null}
        <Text style={u.muted}>
          🙋 {c.beneficiaries} beneficiário(s) · 📍 {c.openNeeds} necessidade(s) em aberto
        </Text>
        {c.description ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{c.description}</Text> : null}

        <View style={u.row}>
          <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoCommunityForm", { community: c })} />
          {hasCoords ? (
            <Btn
              small
              kind="outline"
              label="🗺️ Abrir no mapa"
              onPress={() => Linking.openURL(`https://www.google.com/maps?q=${c.lat},${c.lng}`)}
            />
          ) : null}
        </View>
      </Card>

      <SubTitle>Necessidades em aberto ({open.length})</SubTitle>
      <Btn label="📍 Identificar necessidade" onPress={() => navigation.navigate("NgoNeedForm", { communityId: id })} />

      {open.length === 0 ? (
        <Empty text="Nenhuma necessidade em aberto nesta comunidade." />
      ) : (
        open.map((n) => <NeedCard key={n.id} need={n} catalog={catalog} navigation={navigation} onChanged={loader.reload} />)
      )}

      {served.length > 0 ? (
        <>
          <SubTitle>Necessidades atendidas ({served.length})</SubTitle>
          {served.map((n) => (
            <NeedCard key={n.id} need={n} catalog={catalog} navigation={navigation} onChanged={loader.reload} />
          ))}
        </>
      ) : null}

      <SubTitle>Beneficiários ({d.beneficiaries.total})</SubTitle>
      <View style={u.row}>
        <Btn small label="➕ Registar beneficiário" onPress={() => navigation.navigate("NgoBeneficiaryForm", { communityId: id })} />
        <Btn small kind="outline" label="📋 Ver todos" onPress={() => navigation.navigate("NgoBeneficiaries", { communityId: id })} />
      </View>

      {d.beneficiaries.items.length === 0 ? (
        <Empty text="Ainda não registou beneficiários desta comunidade." />
      ) : (
        d.beneficiaries.items.map((b: any) => (
          <Card key={b.id}>
            <Text style={u.strong}>{b.name}</Text>
            <Text style={u.muted}>
              {labelOf(catalog.sectors, b.sector)}
              {b.gender ? ` · ${labelOf(catalog.genders, b.gender)}` : ""}
              {b.isYouth ? " · Jovem" : ""}
            </Text>
            {b.projectName ? <Text style={u.muted}>📋 {b.projectName}</Text> : null}
          </Card>
        ))
      )}

      <Btn small kind="danger" label="🗑️ Apagar comunidade" onPress={remove} />
    </Page>
  );
}
