import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import MediaGallery from "../components/ngo/MediaGallery";
import ReportTimeline from "../components/gov/ReportTimeline";
import { getMyReport, commentMyReport, deleteMyReport } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { REPORT_ICON, REPORT_STATUS_COLOR } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

export default function GovMyReportScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useGovCatalog();
  const loader = useLoader(() => getMyReport(id), null as any, [id]);
  const d: any = loader.data;

  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Pedido</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const r = d.report;
  const media = (r.imageUrls ?? []).map((url: string, i: number) => ({ id: `${i}`, kind: "IMAGE", url, caption: "" }));
  const hasCoords = r.lat !== null && r.lng !== null && r.lat !== undefined;

  async function shareProtocol() {
    try {
      await Share.share({ message: `Protocolo do meu pedido no NÔDJUNTA AGRO: ${r.protocol}` });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar."));
    }
  }

  async function sendComment() {
    if (comment.trim().length < 3) {
      Alert.alert("Atenção", "Escreva a informação que quer juntar.");
      return;
    }
    setBusy(true);
    try {
      loader.setData(await commentMyReport(id, comment.trim()));
      setComment("");
      setShowComment(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível juntar a informação."));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    Alert.alert("Apagar pedido", "Só se pode apagar um pedido que ainda ninguém analisou. Apagar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMyReport(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível apagar."));
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
            {REPORT_ICON[r.category] ?? "📝"} {r.title}
          </Title>
        </View>
        <Badge label={labelOf(catalog.reportStatus, r.status)} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
      </View>

      <Card>
        <Text style={u.muted}>Número de protocolo</Text>
        <Text style={{ fontSize: 20, fontWeight: "bold", letterSpacing: 1 }}>{r.protocol}</Text>
        <Text style={u.muted}>
          {labelOf(catalog.reportCategories, r.category)} · enviado em {formatDateTime(r.createdAt)}
        </Text>
        <Btn small kind="outline" label="📤 Partilhar protocolo" onPress={shareProtocol} />
      </Card>

      <Card>
        <Text style={u.muted}>Instituição</Text>
        <Text style={u.strong}>{r.institution ? r.institution.name : "Aberto a todas as instituições"}</Text>
        {!r.institution ? <Text style={u.muted}>Ainda ninguém o assumiu. Quando uma instituição o assumir, é avisado.</Text> : null}
        {r.institution && !r.anonymous ? (
          <Btn small kind="outline" label="💬 Falar com a instituição" onPress={() => navigation.navigate("Chat", { userId: r.institution.id, userName: r.institution.name })} />
        ) : null}
        {r.anonymous ? <Text style={[u.muted, { marginTop: 6 }]}>🕶️ Enviado sem o seu nome. A instituição não pode falar consigo: acompanhe aqui.</Text> : null}
      </Card>

      <SubTitle>O que enviou</SubTitle>
      <Text style={{ lineHeight: 21 }}>{r.message}</Text>
      {r.region || r.location ? <Text style={[u.muted, { marginTop: 6 }]}>📍 {[r.location, r.region].filter(Boolean).join(", ")}</Text> : null}
      {r.place ? <Text style={u.muted}>🏗️ Local: {r.place.name}</Text> : null}
      {hasCoords ? <Btn small kind="outline" label="🗺️ Ver o ponto no mapa" onPress={() => Linking.openURL(`https://www.google.com/maps?q=${r.lat},${r.lng}`)} /> : null}
      {media.length > 0 ? <MediaGallery media={media} /> : null}

      {r.answer && r.status !== "RECEBIDO" ? (
        <>
          <SubTitle>Última resposta</SubTitle>
          <Card>
            <Text style={{ lineHeight: 21 }}>{r.answer}</Text>
          </Card>
        </>
      ) : null}

      <SubTitle>Acompanhamento</SubTitle>
      <ReportTimeline events={d.events} catalog={catalog} />

      {d.canComment ? (
        <>
          <Btn kind="outline" label={showComment ? "Fechar" : "➕ Juntar mais informação"} onPress={() => setShowComment(!showComment)} />
          {showComment ? (
            <Card>
              <Field label="Nova informação" value={comment} onChangeText={setComment} multiline placeholder="Ex: O problema piorou com a chuva de ontem" />
              <Btn label={busy ? "A enviar..." : "Enviar"} onPress={sendComment} disabled={busy} />
            </Card>
          ) : null}
        </>
      ) : (
        <Text style={[u.muted, { marginTop: 8 }]}>Este pedido está encerrado. Se for preciso, envie um novo pedido.</Text>
      )}

      <View style={u.row}>
        <Btn small kind="outline" label="➕ Novo pedido" onPress={() => navigation.navigate("GovReportForm")} />
        {d.canDelete ? <Btn small kind="danger" label="Apagar pedido" onPress={remove} /> : null}
      </View>
    </Page>
  );
}
