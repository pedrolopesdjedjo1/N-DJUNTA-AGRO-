import React, { useCallback, useState } from "react";
import { View, Text, Image, Switch, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { TransporterLayout } from "../components/TransporterTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getTransporterProfile, setTransporterAvailability } from "../api/transporter";
import { getGovRegions } from "../api/gov";
import { useTransportCatalog } from "../utils/transportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { VEHICLE_ICON, VERIFICATION_COLOR, stars } from "../constants/transporter";
import { getApiErrorMessage } from "../api/errorMessage";
import { SUPPORT, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = { data: null as any, regions: [] as { key: string; name: string }[] };

export default function TransporterProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const catalog = useTransportCatalog();

  const loader = useLoader(
    async () => {
      const [data, regions] = await Promise.all([getTransporterProfile(), getGovRegions().catch(() => [] as any[])]);
      return { data, regions: regions.map((r: any) => ({ key: r.key, name: r.name })) };
    },
    EMPTY
  );
  const d: any = loader.data;
  const data: any = d.data;
  const [switching, setSwitching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!data) {
    return (
      <TransporterLayout active="TransporterProfile">
        <Page loader={loader}>
          <Title>👤 Meu perfil</Title>
          <Empty text="A carregar..." />
        </Page>
      </TransporterLayout>
    );
  }

  const p = data.profile;
  const user = data.user;
  const regionNames = (p.regions as string[]).map((k) => d.regions.find((r: any) => r.key === k)?.name ?? k);
  const verified = p.verificationStatus === "APROVADO" || user.isVerified;
  const status = verified ? "APROVADO" : p.verificationStatus;
  const docIssues = (data.documents as any[]).filter((x) => x.expired || x.expiringSoon);

  async function toggleAvailable(value: boolean) {
    setSwitching(true);
    try {
      loader.setData({ ...d, data: await setTransporterAvailability(value) });
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar a disponibilidade."));
    } finally {
      setSwitching(false);
    }
  }

  return (
    <TransporterLayout active="TransporterProfile">
      <Page loader={loader}>
        <Title>👤 Meu perfil</Title>

        <View style={[u.row, { alignItems: "center" }]}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
          ) : (
            <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 34 }}>{VEHICLE_ICON[p.vehicleType ?? "OUTRO"] ?? "🚚"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>{user.name}</Text>
            {user.location ? <Text style={u.muted}>📍 {user.location}</Text> : null}
            <View style={[u.row, { marginTop: 4 }]}>
              <Badge label={verified ? "Verificado ✅" : labelOf(catalog.verificationStatus, status) || status} color={verified ? "#2E7D32" : VERIFICATION_COLOR[status] ?? "#757575"} />
            </View>
            <Text style={[u.muted, { marginTop: 4 }]}>
              {data.rating.average ? `${stars(data.rating.average)} ${data.rating.average} (${data.rating.count})` : "Ainda sem avaliações"} · 🚚 {data.stats.delivered} entrega(s)
            </Text>
          </View>
        </View>

        <View style={u.row}>
          <Btn small label="✏️ Editar perfil e veículo" onPress={() => navigation.navigate("TransporterProfileForm")} />
          <Btn small kind="outline" label="👁️ Ver como os clientes veem" onPress={() => navigation.navigate("TransporterPublic", { id: user.id })} />
        </View>

        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>{p.isAvailable ? "🟢 Disponível para entregas" : "🔴 Indisponível"}</Text>
              <Text style={u.muted}>{p.isAvailable ? "Vê e pode aceitar entregas novas." : "Não aceita entregas novas até ligar de novo."}</Text>
            </View>
            <Switch value={p.isAvailable} onValueChange={toggleAvailable} disabled={switching} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>
        </Card>

        {!data.complete ? (
          <Card>
            <Text style={u.strong}>Complete o perfil</Text>
            <Text style={u.muted}>Indique o veículo e as regiões onde trabalha. Sem isso não vê as entregas certas.</Text>
            <Btn small label="Completar agora" onPress={() => navigation.navigate("TransporterProfileForm")} />
          </Card>
        ) : null}

        <SubTitle>Veículo</SubTitle>
        <Card>
          {p.vehicleType ? (
            <>
              <Text style={u.strong}>
                {VEHICLE_ICON[p.vehicleType] ?? "🚚"} {labelOf(catalog.vehicleTypes, p.vehicleType)}
              </Text>
              {p.vehicleBrand || p.vehicleModel || p.vehicleYear ? (
                <Text style={u.muted}>{[p.vehicleBrand, p.vehicleModel, p.vehicleYear].filter(Boolean).join(" ")}</Text>
              ) : null}
              {p.plate ? <Text style={u.muted}>Matrícula: {p.plate}</Text> : null}
              {p.capacityKg ? <Text style={u.muted}>Capacidade: {p.capacityKg} kg</Text> : null}
            </>
          ) : (
            <Text style={u.muted}>Ainda não indicou o veículo.</Text>
          )}
        </Card>

        <SubTitle>Regiões onde trabalha</SubTitle>
        <View style={u.row}>
          {regionNames.length === 0 ? <Text style={u.muted}>Ainda não escolheu.</Text> : null}
          {regionNames.map((r) => (
            <Badge key={r} label={r} color="#1565C0" />
          ))}
        </View>

        {p.bio ? (
          <>
            <SubTitle>Sobre mim</SubTitle>
            <Text style={{ lineHeight: 21 }}>{p.bio}</Text>
          </>
        ) : null}

        <SubTitle>Contacto</SubTitle>
        <Card>
          {user.phone ? <Text>📞 {user.phone}</Text> : <Text style={u.muted}>Sem telefone.</Text>}
          <Text style={[u.muted, { marginTop: 4 }]}>O telefone só aparece a quem tem uma entrega consigo.</Text>
        </Card>

        <SubTitle>Documentos e verificação</SubTitle>
        <Card>
          <Text style={u.strong}>{labelOf(catalog.verificationStatus, status) || status}</Text>
          <Text style={u.muted}>{data.documents.length} documento(s) guardado(s)</Text>
          {docIssues.map((x: any) => (
            <Text key={x.id} style={{ color: x.expired ? "#C62828" : "#EF6C00", marginTop: 4 }}>
              {x.expired ? "⛔" : "⚠️"} {x.name}: {x.expired ? "fora do prazo" : `termina em ${formatDate(x.expiresAt)}`}
            </Text>
          ))}
          <Btn small label="✅ Abrir a verificação" onPress={() => navigation.navigate("TransporterVerification")} />
        </Card>

        <SubTitle>Atalhos</SubTitle>
        <View style={u.row}>
          <Btn small kind="outline" label="💰 Ganhos" onPress={() => navigation.navigate("TransporterEarnings")} />
          <Btn small kind="outline" label="⭐ Avaliações" onPress={() => navigation.navigate("TransporterRatings")} />
          <Btn small kind="outline" label="📑 Relatório" onPress={() => navigation.navigate("TransporterReport")} />
        </View>

        <SubTitle>Suporte NÔDJUNTA AGRO</SubTitle>
        {SUPPORT.phones.map((phone: string) => (
          <Card key={phone}>
            <Text style={u.strong}>📞 {phone}</Text>
            <View style={u.row}>
              <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${phone}`)} />
              <Btn small kind="outline" label="💬 WhatsApp" onPress={() => Linking.openURL(`https://wa.me/245${phone}`)} />
            </View>
          </Card>
        ))}
        <Card>
          <Text style={u.strong}>📧 {SUPPORT.email}</Text>
          <Btn small label="Enviar e-mail" onPress={() => Linking.openURL(`mailto:${SUPPORT.email}`)} />
        </Card>

        <View style={u.row}>
          <Btn small kind="outline" label="🆘 Pedido de ajuda" onPress={() => navigation.navigate("Help")} />
          <Btn small kind="outline" label="⚙️ Configurações" onPress={() => navigation.navigate("Settings")} />
          <Btn small kind="outline" label="🌐 Idioma" onPress={() => navigation.navigate("Language")} />
        </View>

        <Btn kind="danger" label="Sair da conta" onPress={logout} />
      </Page>
    </TransporterLayout>
  );
}
