import React, { useCallback } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getTraining, enrollInTraining, leaveTraining } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { ENROLL_STATUS_COLOR, colorOf } from "../constants/ngo";
import { MATERIAL_ICON, TRAINING_STATE, trainingState, whenText } from "../constants/training";
import { getApiErrorMessage } from "../api/errorMessage";

export default function NgoTrainingPublicScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();

  const loader = useLoader(() => getTraining(id), null as any, [id]);
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
        <Title>Formação</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const t = d.training;
  const enrollment = d.enrollment;
  const state = trainingState(t);
  const stateInfo = TRAINING_STATE[state];
  const org = t.organization;
  const canEnroll = !t.enrolled && !t.finished && !t.isMine && t.status === "ABERTA" && t.spotsLeft !== 0;
  const canLeave = t.enrolled && enrollment?.status === "INSCRITO" && !t.finished;
  const seesMaterials = t.enrolled || t.isMine;

  function enroll() {
    Alert.alert("Inscrever-me", `Quer inscrever-se em "${t.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Inscrever-me",
        onPress: async () => {
          try {
            await enrollInTraining(id);
            Alert.alert("Inscrição feita", "Vai receber avisos desta formação.");
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível inscrever."));
          }
        },
      },
    ]);
  }

  function leave() {
    Alert.alert("Cancelar inscrição", "Deixar de participar nesta formação?", [
      { text: "Não", style: "cancel" },
      {
        text: "Cancelar inscrição",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveTraining(id);
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível cancelar a inscrição."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{t.title}</Title>
        </View>
        <Badge label={stateInfo.label} color={stateInfo.color} />
      </View>

      <Text style={u.muted}>
        {labelOf(catalog.trainingKinds, t.kind)}
        {t.area ? ` · ${labelOf(catalog.areas, t.area)}` : ""}
        {t.hours ? ` · ${t.hours} horas` : ""}
      </Text>

      <Card>
        <Text style={u.muted}>Organização</Text>
        <Text style={u.strong}>
          {org?.name ?? "Organização"} {org?.isVerified ? "✅" : ""}
        </Text>
        <View style={u.row}>
          <Btn small kind="outline" label="Ver organização" onPress={() => navigation.navigate("NgoPublicOrganization", { id: t.ownerId })} />
          {!t.isMine ? (
            <Btn small kind="outline" label="💬 Contactar" onPress={() => navigation.navigate("Chat", { userId: t.ownerId, userName: org?.name ?? "Organização" })} />
          ) : null}
        </View>
      </Card>

      <Card>
        <Text>🕒 {whenText(t)}</Text>
        <Text style={u.muted}>{t.isOnline ? "💻 Formação online" : `📍 ${t.location ?? "—"}${t.region ? `, ${t.region}` : ""}`}</Text>
        {t.isOnline ? (
          t.onlineLink ? (
            <Btn small kind="outline" label="🔗 Abrir a sessão online" onPress={() => Linking.openURL(t.onlineLink)} />
          ) : (
            <Text style={u.muted}>O endereço da sessão aparece depois de se inscrever.</Text>
          )
        ) : null}
        <Text style={u.muted}>
          👥 {t.enrolledCount} inscrito(s)
          {t.spotsLeft !== null && t.spotsLeft !== undefined ? ` · ${t.spotsLeft === 0 ? "sem vagas" : `${t.spotsLeft} vaga(s) livre(s)`}` : ""}
        </Text>
        {t.description ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{t.description}</Text> : null}
      </Card>

      {t.status === "CANCELADA" ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>Esta formação foi cancelada.</Text>
        </Card>
      ) : null}

      {t.enrolled ? (
        <Card>
          <View style={u.between}>
            <Text style={u.strong}>A sua inscrição</Text>
            <Badge label={labelOf(catalog.enrollStatus, enrollment?.status)} color={colorOf(ENROLL_STATUS_COLOR, enrollment?.status)} />
          </View>
          {enrollment?.certificateCode ? (
            <>
              <Text style={[u.muted, { marginTop: 4 }]}>🎓 Certificado {enrollment.certificateCode}</Text>
              <Btn small label="🎓 Ver o meu certificado" onPress={() => navigation.navigate("NgoCertificate", { enrollmentId: enrollment.id })} />
            </>
          ) : null}
        </Card>
      ) : null}

      <View style={u.row}>
        {canEnroll ? <Btn label="✅ Inscrever-me" onPress={enroll} /> : null}
        {canLeave ? <Btn kind="outline" label="Cancelar inscrição" onPress={leave} /> : null}
        {t.isMine ? <Btn label="Gerir esta formação" onPress={() => navigation.navigate("NgoTraining", { id })} /> : null}
      </View>

      <SubTitle>Materiais e vídeos</SubTitle>
      {seesMaterials ? (
        d.materials.length === 0 ? (
          <Empty text="Ainda não há materiais." />
        ) : (
          d.materials.map((m: any) => (
            <Card key={m.id}>
              <Text style={u.strong}>
                {MATERIAL_ICON[m.kind] ?? "📎"} {m.title}
              </Text>
              <Btn small kind="outline" label="Abrir" onPress={() => Linking.openURL(m.url)} />
            </Card>
          ))
        )
      ) : (
        <Text style={u.muted}>
          {d.materialsCount > 0 ? `${d.materialsCount} material(is) disponível(eis) depois de se inscrever.` : "Esta formação ainda não tem materiais."}
        </Text>
      )}
    </Page>
  );
}
