import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getService, setServiceStatus, deleteService } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { SERVICE_ICON, SERVICE_STATUS_COLOR } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";

export default function GovServiceScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useGovCatalog();
  const loader = useLoader(() => getService(id), null as any, [id]);
  const s: any = loader.data;

  const [showStatus, setShowStatus] = useState(false);
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!s) {
    return (
      <Page loader={loader}>
        <Title>Serviço</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const color = SERVICE_STATUS_COLOR[s.status] ?? "#757575";
  const closed = s.status === "TEMPORARIO" || s.status === "ENCERRADO";
  const hasCoords = s.lat !== null && s.lng !== null && s.lat !== undefined;
  const needsNote = next === "TEMPORARIO" || next === "ENCERRADO";

  async function share() {
    const lines = [
      `${s.name} (${s.organization?.name ?? "Serviço público"})`,
      s.description ? `\n${s.description}` : "",
      s.requiredDocuments?.length ? `\nDocumentos necessários:\n${s.requiredDocuments.map((d: string) => `- ${d}`).join("\n")}` : "",
      s.howToRequest ? `\nOnde e como pedir: ${s.howToRequest}` : "",
      s.address || s.region ? `\nLocal: ${[s.address, s.region].filter(Boolean).join(", ")}` : "",
      s.schedule ? `Horário: ${s.schedule}` : "",
      s.phone ? `Telefone: ${s.phone}` : "",
      "\nInformação do NÔDJUNTA AGRO.",
    ];
    try {
      await Share.share({ message: lines.filter(Boolean).join("\n") });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar."));
    }
  }

  async function saveStatus() {
    if (!next) {
      Alert.alert("Atenção", "Escolha o novo estado.");
      return;
    }
    if (needsNote && note.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o motivo ou a data de regresso, para as pessoas perceberem.");
      return;
    }

    setBusy(true);
    try {
      loader.setData(await setServiceStatus(id, { status: next, note: note.trim() || undefined }));
      setShowStatus(false);
      setNext("");
      setNote("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar o estado."));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    Alert.alert("Apagar serviço", `Apagar "${s.name}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteService(id);
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
            {SERVICE_ICON[s.category] ?? "🏛️"} {s.name}
          </Title>
        </View>
        <Badge label={labelOf(catalog.serviceStatus, s.status)} color={color} />
      </View>
      <Text style={u.muted}>{labelOf(catalog.serviceCategories, s.category)}</Text>

      {closed && s.statusNote ? (
        <Card>
          <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ {s.statusNote}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={u.muted}>Instituição</Text>
        <Text style={u.strong}>
          {s.organization?.name ?? "Instituição"} {s.organization?.isVerified ? "✅" : ""}
        </Text>
        <View style={u.row}>
          <Btn small kind="outline" label="Ver instituição" onPress={() => navigation.navigate("NgoPublicOrganization", { id: s.ownerId })} />
          {!s.isMine ? (
            <Btn small kind="outline" label="💬 Perguntar" onPress={() => navigation.navigate("Chat", { userId: s.ownerId, userName: s.organization?.name ?? "Instituição" })} />
          ) : null}
        </View>
      </Card>

      {s.description ? (
        <>
          <SubTitle>Sobre o serviço</SubTitle>
          <Text style={{ lineHeight: 21 }}>{s.description}</Text>
        </>
      ) : null}

      <SubTitle>Documentos necessários</SubTitle>
      {s.requiredDocuments?.length > 0 ? (
        <Card>
          {s.requiredDocuments.map((doc: string, i: number) => (
            <Text key={`${doc}-${i}`} style={{ marginTop: i === 0 ? 0 : 6 }}>
              ☑️ {doc}
            </Text>
          ))}
        </Card>
      ) : (
        <Text style={u.muted}>Não foi indicada uma lista de documentos. Pergunte à instituição.</Text>
      )}

      {s.howToRequest ? (
        <>
          <SubTitle>Onde e como pedir</SubTitle>
          <Text style={{ lineHeight: 21 }}>{s.howToRequest}</Text>
        </>
      ) : null}

      {s.fee || s.processingTime ? (
        <Card>
          {s.fee ? <Text>💰 Custo: {s.fee}</Text> : null}
          {s.processingTime ? <Text style={u.muted}>⏱️ Prazo: {s.processingTime}</Text> : null}
        </Card>
      ) : null}

      <SubTitle>Localização, horário e contactos</SubTitle>
      <Card>
        {s.address || s.region ? <Text>📍 {[s.address, s.region].filter(Boolean).join(", ")}</Text> : null}
        {s.schedule ? <Text style={u.muted}>🕒 {s.schedule}</Text> : null}
        {s.phone ? <Text style={u.muted}>📞 {s.phone}</Text> : null}
        {s.email ? <Text style={u.muted}>✉️ {s.email}</Text> : null}
        {s.website ? <Text style={u.muted}>🌐 {s.website}</Text> : null}
        {!s.address && !s.region && !s.schedule && !s.phone && !s.email && !s.website ? <Text style={u.muted}>Sem contactos indicados.</Text> : null}

        <View style={u.row}>
          {hasCoords ? (
            <Btn small label="🗺️ Como chegar" onPress={() => Linking.openURL(`https://www.google.com/maps?q=${s.lat},${s.lng}`)} />
          ) : null}
          {s.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${s.phone}`)} /> : null}
          {s.email ? <Btn small kind="outline" label="✉️ E-mail" onPress={() => Linking.openURL(`mailto:${s.email}`)} /> : null}
          {s.website ? <Btn small kind="outline" label="🌐 Website" onPress={() => Linking.openURL(s.website)} /> : null}
        </View>
      </Card>

      <View style={u.row}>
        <Btn small kind="outline" label="📤 Partilhar" onPress={share} />
        {!s.isMine ? (
          <Btn
            small
            kind="outline"
            label="📝 Reclamar ou sugerir"
            onPress={() => navigation.navigate("GovReportForm", { institutionId: s.ownerId, institutionName: s.organization?.name, category: "SUGESTAO" })}
          />
        ) : null}
      </View>

      {s.isMine ? (
        <>
          <SubTitle>Gerir este serviço</SubTitle>
          {s.isPublished === false ? (
            <Card>
              <Text style={u.muted}>🔒 Este serviço é um rascunho: só a sua instituição o vê. Edite-o e ligue "Publicado" para o mostrar a todos.</Text>
            </Card>
          ) : null}

          <View style={u.row}>
            <Btn small label="✏️ Editar" onPress={() => navigation.navigate("GovServiceForm", { service: s })} />
            <Btn small kind="outline" label={showStatus ? "Fechar" : "Mudar o estado"} onPress={() => setShowStatus(!showStatus)} />
            <Btn small kind="danger" label="Apagar" onPress={remove} />
          </View>

          {showStatus ? (
            <Card>
              <Text style={u.strong}>Novo estado</Text>
              <View style={u.row}>
                {catalog.serviceStatus.map((st) => (
                  <Chip key={st.value} label={st.label} active={next === st.value} onPress={() => setNext(st.value)} />
                ))}
              </View>
              {needsNote ? (
                <Field label="Motivo ou data de regresso" value={note} onChangeText={setNote} placeholder="Ex: Fechado para obras até 15 de dezembro" multiline />
              ) : null}
              <Btn label={busy ? "A guardar..." : "Guardar estado"} onPress={saveStatus} disabled={busy} />
            </Card>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
