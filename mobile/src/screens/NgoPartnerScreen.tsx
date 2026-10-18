import React, { useCallback } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getPartner, deletePartner } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { FUNDING_STATUS_COLOR, PARTNER_STATUS_COLOR, PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

export default function NgoPartnerScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();

  const loader = useLoader(() => getPartner(id), null as any, [id]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Parceiro</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const p = d.partner;
  const receivedTotal = (d.funding as any[]).filter((f) => f.status === "RECEBIDO").reduce((s, f) => s + f.amount, 0);

  function remove() {
    Alert.alert("Apagar parceiro", `Apagar "${p.name}"? Os financiamentos ficam guardados, mas sem o nome do parceiro.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePartner(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar o parceiro."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{p.name}</Title>
        </View>
        <Badge label={labelOf(catalog.partnerStatus, p.status)} color={colorOf(PARTNER_STATUS_COLOR, p.status)} />
      </View>
      <Text style={u.muted}>{labelOf(catalog.partnerTypes, p.type)}</Text>

      <Card>
        {p.contactName ? <Text>👤 {p.contactName}</Text> : null}
        {p.phone ? <Text style={u.muted}>📞 {p.phone}</Text> : null}
        {p.email ? <Text style={u.muted}>✉️ {p.email}</Text> : null}
        {p.website ? <Text style={u.muted}>🌐 {p.website}</Text> : null}
        {p.region ? <Text style={u.muted}>📍 {p.region}</Text> : null}
        {p.notes ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{p.notes}</Text> : null}
        {!p.contactName && !p.phone && !p.email && !p.website && !p.region && !p.notes ? (
          <Text style={u.muted}>Sem mais dados. Toque em Editar para juntar contactos.</Text>
        ) : null}

        <View style={u.row}>
          {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
          {p.email ? <Btn small kind="outline" label="✉️ E-mail" onPress={() => Linking.openURL(`mailto:${p.email}`)} /> : null}
          {p.website ? <Btn small kind="outline" label="🌐 Website" onPress={() => Linking.openURL(p.website)} /> : null}
          {p.linkedUserId ? (
            <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.linkedUserId, userName: p.name })} />
          ) : null}
        </View>
        <View style={u.row}>
          <Btn small label="✏️ Editar" onPress={() => navigation.navigate("NgoPartnerForm", { partner: p })} />
          <Btn small kind="danger" label="Apagar" onPress={remove} />
        </View>
      </Card>

      <SubTitle>Projetos ({d.projects.length})</SubTitle>
      {d.projects.length === 0 ? (
        <Empty text="Este parceiro ainda não está ligado a projetos. Ligue-o no separador Parceiros de um projeto." />
      ) : (
        d.projects.map((pr: any) => (
          <Card key={pr.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{pr.name}</Text>
              <Badge label={labelOf(catalog.projectStatus, pr.status)} color={colorOf(PROJECT_STATUS_COLOR, pr.status)} />
            </View>
            {pr.role ? <Text style={u.muted}>Papel: {pr.role}</Text> : null}
            <Btn small kind="outline" label="Abrir projeto" onPress={() => navigation.navigate("NgoProject", { id: pr.id })} />
          </Card>
        ))
      )}

      <SubTitle>Financiamento deste parceiro</SubTitle>
      {d.funding.length > 0 ? <Text style={u.muted}>💰 Já recebido: {money(receivedTotal)}</Text> : null}
      <Btn small label="➕ Registar financiamento deste parceiro" onPress={() => navigation.navigate("NgoFundingForm", { partnerId: id })} />

      {d.funding.length === 0 ? (
        <Empty text="Ainda não há financiamentos ligados a este parceiro." />
      ) : (
        d.funding.map((f: any) => (
          <Card key={f.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{f.title}</Text>
              <Badge label={labelOf(catalog.fundingStatus, f.status)} color={colorOf(FUNDING_STATUS_COLOR, f.status)} />
            </View>
            <Text style={{ fontWeight: "bold", marginTop: 4 }}>{money(f.amount)}</Text>
            <Text style={u.muted}>
              {labelOf(catalog.fundingKinds, f.kind)} · {formatDate(f.createdAt)}
            </Text>
          </Card>
        ))
      )}
    </Page>
  );
}
