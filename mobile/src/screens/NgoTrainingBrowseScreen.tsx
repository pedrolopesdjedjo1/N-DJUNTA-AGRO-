import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listTrainings, enrollInTraining } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { ENROLL_STATUS_COLOR, colorOf } from "../constants/ngo";
import { whenText } from "../constants/training";
import { getApiErrorMessage } from "../api/errorMessage";

// Formações de todas as organizações. Qualquer pessoa pode ver e inscrever-se.
export default function NgoTrainingBrowseScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const [kind, setKind] = useState("");
  const [area, setArea] = useState("");
  const [region, setRegion] = useState("");
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [busyId, setBusyId] = useState("");

  const loader = useLoader(() => listTrainings({ kind, area, region, q, when }), [] as any[], [kind, area, region, q, when]);
  const items: any[] = loader.data;

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function enroll(t: any) {
    Alert.alert("Inscrever-me", `Quer inscrever-se em "${t.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Inscrever-me",
        onPress: async () => {
          setBusyId(t.id);
          try {
            await enrollInTraining(t.id);
            Alert.alert("Inscrição feita", "Vai receber avisos desta formação.");
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível inscrever."));
          } finally {
            setBusyId("");
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <Title>🔎 Formações</Title>
      <Text style={u.muted}>Cursos, workshops e seminários das organizações.</Text>

      <Btn small kind="outline" label="🎓 As minhas inscrições e certificados" onPress={() => navigation.navigate("NgoMyTrainings")} />

      <Field
        placeholder="Procurar pelo título"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <View style={u.row}>
        <Chip label="Próximas" active={when === "upcoming"} onPress={() => setWhen("upcoming")} />
        <Chip label="Já realizadas" active={when === "past"} onPress={() => setWhen("past")} />
      </View>

      <ChipGroup label="Tipo" options={catalog.trainingKinds} value={kind} onChange={setKind} allowEmpty scroll />
      <ChipGroup label="Área" options={catalog.areas} value={area} onChange={setArea} allowEmpty scroll />
      {regions.length > 0 ? <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll /> : null}

      {items.length === 0 ? (
        <Empty text={when === "upcoming" ? "Não há formações marcadas com estes filtros." : "Nenhuma formação encontrada."} />
      ) : (
        items.map((t) => {
          const canEnroll = !t.enrolled && !t.finished && !t.isMine && t.status === "ABERTA" && t.spotsLeft !== 0;
          return (
            <Card key={t.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{t.title}</Text>
                {t.enrolled ? <Badge label={labelOf(catalog.enrollStatus, t.myStatus)} color={colorOf(ENROLL_STATUS_COLOR, t.myStatus)} /> : null}
              </View>

              <Text style={u.muted}>
                {labelOf(catalog.trainingKinds, t.kind)}
                {t.area ? ` · ${labelOf(catalog.areas, t.area)}` : ""}
                {t.hours ? ` · ${t.hours} h` : ""}
              </Text>
              <Text style={u.muted}>
                🏢 {t.organization?.name ?? "Organização"} {t.organization?.isVerified ? "✅" : ""}
              </Text>
              <Text style={u.muted}>🕒 {whenText(t)}</Text>
              <Text style={u.muted}>{t.isOnline ? "💻 Online" : `📍 ${t.location ?? "—"}${t.region ? `, ${t.region}` : ""}`}</Text>
              <Text style={u.muted}>
                👥 {t.enrolledCount} inscrito(s)
                {t.spotsLeft !== null && t.spotsLeft !== undefined ? ` · ${t.spotsLeft === 0 ? "sem vagas" : `${t.spotsLeft} vaga(s)`}` : ""}
              </Text>

              <View style={u.row}>
                <Btn small label="Ver detalhes" onPress={() => navigation.navigate("NgoTrainingPublic", { id: t.id })} />
                {canEnroll ? <Btn small kind="outline" label={busyId === t.id ? "A inscrever..." : "Inscrever-me"} onPress={() => enroll(t)} disabled={busyId === t.id} /> : null}
                {t.isMine ? <Btn small kind="outline" label="Gerir" onPress={() => navigation.navigate("NgoTraining", { id: t.id })} /> : null}
              </View>
            </Card>
          );
        })
      )}
    </Page>
  );
}
