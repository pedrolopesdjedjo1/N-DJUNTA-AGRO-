import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getMyEnrollments } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { ENROLL_STATUS_COLOR, colorOf } from "../constants/ngo";
import { formatDate, formatDateTime } from "../constants/market";

// As minhas inscrições e certificados (serve para qualquer perfil)
export default function NgoMyTrainingsScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const loader = useLoader(getMyEnrollments, [] as any[]);
  const items: any[] = loader.data;
  const [code, setCode] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const certificates = items.filter((e) => e.status === "CONCLUIDO" && e.certificateCode);
  const others = items.filter((e) => !(e.status === "CONCLUIDO" && e.certificateCode));

  function verify() {
    const value = code.trim().toUpperCase();
    if (value.length < 5) {
      Alert.alert("Atenção", "Escreva o código do certificado (ex: CERT-ABCD1234).");
      return;
    }
    navigation.navigate("NgoCertificate", { code: value });
  }

  return (
    <Page loader={loader}>
      <Title>🎓 Os meus certificados</Title>

      <Btn label="🔎 Procurar formações" onPress={() => navigation.navigate("NgoTrainingBrowse")} />

      <SubTitle>Certificados ({certificates.length})</SubTitle>
      {certificates.length === 0 ? (
        <Empty text="Ainda não tem certificados. Recebe um certificado ao concluir uma formação." />
      ) : (
        certificates.map((e) => (
          <Card key={e.id}>
            <Text style={u.strong}>🎓 {e.training.title}</Text>
            <Text style={u.muted}>
              {e.organization?.name ?? "Organização"} {e.organization?.isVerified ? "✅" : ""}
            </Text>
            <Text style={u.muted}>
              {labelOf(catalog.trainingKinds, e.training.kind)}
              {e.training.hours ? ` · ${e.training.hours} h` : ""} · emitido em {e.certifiedAt ? formatDate(e.certifiedAt) : formatDate(e.training.startsAt)}
            </Text>
            <Text style={u.muted}>Código {e.certificateCode}</Text>
            <Btn small label="Ver e partilhar" onPress={() => navigation.navigate("NgoCertificate", { enrollmentId: e.id })} />
          </Card>
        ))
      )}

      <SubTitle>As minhas inscrições ({others.length})</SubTitle>
      {others.length === 0 ? (
        <Empty text="Não tem outras inscrições." />
      ) : (
        others.map((e) => (
          <Card key={e.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{e.training.title}</Text>
              <Badge label={labelOf(catalog.enrollStatus, e.status)} color={colorOf(ENROLL_STATUS_COLOR, e.status)} />
            </View>
            <Text style={u.muted}>
              {e.organization?.name ?? "Organização"} {e.organization?.isVerified ? "✅" : ""}
            </Text>
            <Text style={u.muted}>🕒 {formatDateTime(e.training.startsAt)}</Text>
            <Text style={u.muted}>{e.training.isOnline ? "💻 Online" : `📍 ${e.training.location ?? "—"}`}</Text>
            {e.training.status === "CANCELADA" ? <Text style={{ color: "#C62828", marginTop: 4 }}>Formação cancelada</Text> : null}
            <Btn small kind="outline" label="Ver formação" onPress={() => navigation.navigate("NgoTrainingPublic", { id: e.training.id })} />
          </Card>
        ))
      )}

      <SubTitle>Confirmar um certificado</SubTitle>
      <Card>
        <Text style={u.muted}>Recebeu um certificado de outra pessoa? Escreva o código para confirmar que é verdadeiro.</Text>
        <Field label="Código do certificado" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="CERT-ABCD1234" />
        <Btn small label="Confirmar" onPress={verify} />
      </Card>
    </Page>
  );
}
