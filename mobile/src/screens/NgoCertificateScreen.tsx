import React from "react";
import { View, Text, Image, Share, Alert } from "react-native";
import { Page, Title, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { getCertificate, verifyCertificate } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";
import { colors } from "../theme/colors";

// Certificado de uma formação. Abre pelo número da inscrição ou pelo código (para confirmar).
export default function NgoCertificateScreen({ route }: any) {
  const enrollmentId: string | undefined = route?.params?.enrollmentId;
  const code: string | undefined = route?.params?.code;
  const catalog = useNgoCatalog();

  const loader = useLoader(
    async () => {
      if (enrollmentId) return getCertificate(enrollmentId);
      if (code) return verifyCertificate(code);
      throw new Error("Certificado não encontrado.");
    },
    null as any,
    [enrollmentId, code]
  );
  const c: any = loader.data;

  async function share() {
    if (!c) return;
    try {
      await Share.share({ message: c.text });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar o certificado."));
    }
  }

  if (!c) {
    return (
      <Page loader={loader}>
        <Title>🎓 Certificado</Title>
        <Empty text="Certificado não encontrado. Confira o código." />
      </Page>
    );
  }

  return (
    <Page loader={loader}>
      <Title>🎓 Certificado</Title>

      {c.valid ? (
        <Card>
          <Text style={{ color: "#2E7D32", fontWeight: "bold" }}>✅ Certificado válido</Text>
          <Text style={u.muted}>O código existe e foi emitido pela organização indicada.</Text>
        </Card>
      ) : null}

      <View
        style={{
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: 12,
          padding: 20,
          marginTop: 12,
          alignItems: "center",
        }}
      >
        {c.organization.logoUrl ? <Image source={{ uri: c.organization.logoUrl }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }} /> : null}
        <Text style={{ fontWeight: "bold", fontSize: 16, textAlign: "center" }}>
          {c.organization.name} {c.organization.isVerified ? "✅" : ""}
        </Text>

        <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primary, marginTop: 14 }}>CERTIFICADO</Text>

        <Text style={{ marginTop: 14, textAlign: "center" }}>Certifica-se que</Text>
        <Text style={{ fontSize: 20, fontWeight: "bold", textAlign: "center", marginTop: 4 }}>{c.participantName}</Text>

        <Text style={{ marginTop: 14, textAlign: "center", lineHeight: 22 }}>
          concluiu o {labelOf(catalog.trainingKinds, c.training.kind).toLowerCase() || "curso"}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginTop: 4 }}>{c.training.title}</Text>

        {c.training.hours ? <Text style={[u.muted, { marginTop: 8 }]}>Carga horária: {c.training.hours} horas</Text> : null}
        <Text style={u.muted}>Realizado em {formatDate(c.training.startsAt)}</Text>
        {c.training.location ? <Text style={u.muted}>📍 {c.training.location}</Text> : null}

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 10, alignItems: "center" }}>
          <Text style={u.muted}>Código</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", letterSpacing: 1 }}>{c.code}</Text>
          <Text style={[u.muted, { marginTop: 4 }]}>Emitido em {formatDate(c.issuedAt)}</Text>
        </View>
      </View>

      <Text style={[u.muted, { marginTop: 10 }]}>
        Para confirmar este certificado, qualquer pessoa pode escrever o código no app, em Formação, Os meus certificados.
      </Text>

      <Btn label="📤 Partilhar certificado" onPress={share} />
    </Page>
  );
}
