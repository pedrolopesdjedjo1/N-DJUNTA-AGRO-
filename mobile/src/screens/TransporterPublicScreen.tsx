import React from "react";
import { View, Text, Image } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getPublicTransporter } from "../api/transporter";
import { useTransportCatalog } from "../utils/transportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { VEHICLE_ICON, stars } from "../constants/transporter";
import { formatDate } from "../constants/market";

// Cartão de um transportador, visto por quem procura transporte (sem telefone)
export default function TransporterPublicScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useTransportCatalog();

  const loader = useLoader(() => getPublicTransporter(id), null as any, [id]);
  const d: any = loader.data;

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Transportador</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const t = d.transporter;

  return (
    <Page loader={loader}>
      <View style={[u.row, { alignItems: "center" }]}>
        {t.photoUrl ? (
          <Image source={{ uri: t.photoUrl }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
        ) : (
          <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 34 }}>{VEHICLE_ICON[t.vehicleType ?? "OUTRO"] ?? "🚚"}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>{t.name}</Text>
          {t.location ? <Text style={u.muted}>📍 {t.location}</Text> : null}
          <View style={[u.row, { marginTop: 4 }]}>
            <Badge label={t.isVerified ? "Verificado ✅" : "Ainda não verificado"} color={t.isVerified ? "#2E7D32" : "#757575"} />
            <View style={{ marginLeft: 8 }}>
              <Badge label={t.isAvailable ? "Disponível" : "Indisponível"} color={t.isAvailable ? "#2E7D32" : "#757575"} />
            </View>
          </View>
          <Text style={[u.muted, { marginTop: 4 }]}>
            {d.rating.average ? `${stars(d.rating.average)} ${d.rating.average} (${d.rating.count})` : "Ainda sem avaliações"} · 🚚 {d.delivered} entrega(s)
          </Text>
        </View>
      </View>

      {t.isMe ? (
        <View style={u.row}>
          <Btn small label="✏️ Editar o meu perfil" onPress={() => navigation.navigate("TransporterProfileForm")} />
          <Text style={[u.muted, { alignSelf: "center" }]}>É assim que os outros o veem.</Text>
        </View>
      ) : (
        <View style={u.row}>
          <Btn small label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: t.id, userName: t.name })} />
        </View>
      )}

      <SubTitle>Veículo</SubTitle>
      <Card>
        {t.vehicleType ? (
          <>
            <Text style={u.strong}>
              {VEHICLE_ICON[t.vehicleType] ?? "🚚"} {labelOf(catalog.vehicleTypes, t.vehicleType)}
            </Text>
            {t.vehicleBrand || t.vehicleModel || t.vehicleYear ? (
              <Text style={u.muted}>{[t.vehicleBrand, t.vehicleModel, t.vehicleYear].filter(Boolean).join(" ")}</Text>
            ) : null}
            {t.capacityKg ? <Text style={u.muted}>Capacidade: {t.capacityKg} kg</Text> : null}
          </>
        ) : (
          <Text style={u.muted}>Veículo não indicado.</Text>
        )}
      </Card>

      <SubTitle>Regiões onde trabalha</SubTitle>
      <View style={u.row}>
        {t.regions.length === 0 ? <Text style={u.muted}>Não indicadas.</Text> : null}
        {t.regions.map((r: string) => (
          <Badge key={r} label={r} color="#1565C0" />
        ))}
      </View>

      {t.bio ? (
        <>
          <SubTitle>Sobre o transportador</SubTitle>
          <Text style={{ lineHeight: 21 }}>{t.bio}</Text>
        </>
      ) : null}

      <SubTitle>Avaliações recentes</SubTitle>
      {d.recentReviews.length === 0 ? (
        <Empty text="Ainda não há avaliações." />
      ) : (
        d.recentReviews.map((r: any) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text>{stars(r.rating)}</Text>
              <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
            </View>
            {r.comment ? <Text style={{ marginTop: 4 }}>{r.comment}</Text> : null}
          </Card>
        ))
      )}
    </Page>
  );
}
