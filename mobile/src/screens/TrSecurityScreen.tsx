import React, { useCallback, useState } from "react";
import { View, Text, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, useLoader, u } from "../components/ui";
import { getTrSecurity } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { hasLocationPermission } from "../utils/trLocation";
import { labelOf } from "../utils/ngoCatalog";
import { TR_VERIFICATION_COLOR } from "../constants/transporterV2";
import { formatDateTime } from "../constants/market";

const EMPTY = {
  verification: { status: "RASCUNHO", note: null as any },
  documents: { total: 0, expired: 0, expiringSoon: 0 },
  location: { shareLocation: true },
  devices: [] as any[],
  phone: null as any,
  openReports: 0,
  tips: [] as string[],
};

export default function TrSecurityScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(getTrSecurity, EMPTY);
  const d: any = loader.data;
  const [permission, setPermission] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      hasLocationPermission().then(setPermission);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>🔐 Segurança</Title>
        <Text style={u.muted}>Proteja a sua conta e os seus dados.</Text>

        <SubTitle>Verificação de identidade e documentos</SubTitle>
        <Card>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>Estado</Text>
            <Badge label={labelOf(catalog.verificationStatus, d.verification.status) || d.verification.status} color={TR_VERIFICATION_COLOR[d.verification.status] ?? "#757575"} />
          </View>
          {d.verification.note ? <Text style={[u.muted, { marginTop: 4 }]}>📝 {d.verification.note}</Text> : null}
          <Text style={u.muted}>📄 {d.documents.total} documento(s) enviado(s)</Text>
          {d.documents.expired > 0 ? <Text style={{ color: "#C62828" }}>⛔ {d.documents.expired} documento(s) fora do prazo</Text> : null}
          {d.documents.expiringSoon > 0 ? <Text style={{ color: "#EF6C00" }}>⚠️ {d.documents.expiringSoon} documento(s) a terminar em breve</Text> : null}
          <Btn small kind="outline" label="📄 Documentos e verificação" onPress={() => navigation.navigate("TransporterVerification")} />
        </Card>

        <SubTitle>Palavra-passe</SubTitle>
        <Card>
          <Text style={u.muted}>Use uma palavra-passe só sua e difícil de adivinhar. Mude-a se suspeitar que alguém a conhece.</Text>
          <Btn small kind="outline" label="🔑 Mudar a palavra-passe" onPress={() => navigation.navigate("ChangePassword")} />
        </Card>

        <SubTitle>Permissões de localização</SubTitle>
        <Card>
          <View style={u.between}>
            <Text style={{ flex: 1, marginRight: 8 }}>Localização do telemóvel</Text>
            <Badge label={permission === null ? "..." : permission ? "Permitida" : "Não permitida"} color={permission ? "#2E7D32" : "#EF6C00"} />
          </View>
          <View style={[u.between, { marginTop: 6 }]}>
            <Text style={{ flex: 1, marginRight: 8 }}>Partilhar nas entregas</Text>
            <Badge label={d.location.shareLocation ? "Ligada" : "Desligada"} color={d.location.shareLocation ? "#2E7D32" : "#757575"} />
          </View>
          <View style={u.row}>
            <Btn small kind="outline" label="Abrir as definições do telemóvel" onPress={() => Linking.openSettings()} />
            <Btn small kind="outline" label="Privacidade" onPress={() => navigation.navigate("TrSettings")} />
          </View>
        </Card>

        <SubTitle>Aparelhos que usam a conta</SubTitle>
        {d.devices.length === 0 ? (
          <Text style={u.muted}>Ainda não há aparelhos registados.</Text>
        ) : (
          d.devices.map((x: any) => (
            <View key={x.id} style={{ marginTop: 6 }}>
              <Text>{x.label ?? "Aparelho"}</Text>
              <Text style={u.muted}>Último acesso: {formatDateTime(x.lastSeenAt)}</Text>
            </View>
          ))
        )}
        <Btn small kind="outline" label="📱 Ver o histórico de aparelhos" onPress={() => navigation.navigate("Devices")} />

        <SubTitle>Denunciar atividade suspeita</SubTitle>
        <Card>
          <Text style={u.muted}>Alguém lhe pediu pagamentos ou dados fora do app, ou parece fazer-se passar pela equipa? Denuncie.</Text>
          {d.openReports > 0 ? <Text style={{ color: "#EF6C00" }}>Tem {d.openReports} denúncia(s) em análise.</Text> : null}
          <View style={u.row}>
            <Btn small kind="danger" label="🚩 Denunciar" onPress={() => navigation.navigate("ReportCreate")} />
            <Btn small kind="outline" label="📋 As minhas denúncias" onPress={() => navigation.navigate("MyReports")} />
          </View>
        </Card>

        <SubTitle>Proteção dos seus dados</SubTitle>
        <Card>
          <Text style={u.muted}>O comprador só vê o seu primeiro nome, o veículo e a classificação. O seu telefone só fica visível a quem tem uma entrega consigo. A sua localização só é partilhada durante uma entrega, e só se a deixar ligada.</Text>
          <Btn small kind="outline" label="Política de privacidade" onPress={() => navigation.navigate("Legal", { kind: "privacy" })} />
        </Card>

        <SubTitle>Dicas</SubTitle>
        <Card>
          {d.tips.map((t: string, i: number) => (
            <Text key={`${i}-${t}`} style={{ marginTop: i === 0 ? 0 : 8, lineHeight: 20 }}>
              • {t}
            </Text>
          ))}
        </Card>
      </Page>
    </TrLayout>
  );
}
