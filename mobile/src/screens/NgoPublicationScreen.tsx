import React, { useCallback } from "react";
import { View, Text, Image, Alert, Linking, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import MediaGallery from "../components/ngo/MediaGallery";
import { getPublication, updatePublication, deletePublication } from "../api/ngo";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { PUBLICATION_ICON, isOfficialKind, publicationKindLabel } from "../constants/ngoContent";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

export default function NgoPublicationScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();

  const loader = useLoader(() => getPublication(id), null as any, [id]);
  const p: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!p) {
    return (
      <Page loader={loader}>
        <Title>Publicação</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const org = p.organization;
  const orgName = org?.name ?? "Organização";
  const official = isOfficialKind(p.kind) || !!p.isOfficial;
  const media = (p.imageUrls ?? []).map((url: string, i: number) => ({ id: `${i}`, kind: "IMAGE", url, caption: "" }));

  async function share() {
    const text = [p.title, p.body ? `\n${p.body}` : "", `\n— ${orgName} · NÔDJUNTA AGRO`].join("");
    try {
      await Share.share({ message: text });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar."));
    }
  }

  async function togglePublished() {
    try {
      await updatePublication(id, { isPublished: !p.isPublished });
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar a publicação."));
    }
  }

  function remove() {
    Alert.alert("Apagar publicação", "Apagar esta publicação?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePublication(id);
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
      <View style={u.row}>
        <Badge label={`${PUBLICATION_ICON[p.kind] ?? "📰"} ${publicationKindLabel(catalog, p.kind)}`} color={official ? "#1565C0" : "#6A1B9A"} />
        {!p.isPublished ? (
          <View style={{ marginLeft: 8 }}>
            <Badge label="Rascunho" color="#757575" />
          </View>
        ) : null}
      </View>

      <Title>{p.title}</Title>

      <View style={[u.row, { alignItems: "center" }]}>
        {org?.logoUrl ? <Image source={{ uri: org.logoUrl }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={u.strong}>
            {orgName} {org?.isVerified ? "✅" : ""}
          </Text>
          <Text style={u.muted}>{formatDateTime(p.createdAt)}</Text>
        </View>
      </View>

      {official ? <Text style={[u.muted, { marginTop: 4 }]}>🏛️ Publicação oficial de uma instituição pública</Text> : null}
      {p.communityName || p.region ? <Text style={[u.muted, { marginTop: 4 }]}>📍 {[p.communityName, p.region].filter(Boolean).join(", ")}</Text> : null}
      {p.isMine && p.notifiedRegion ? <Text style={u.muted}>🔔 A população da região foi avisada por notificação.</Text> : null}

      {p.body ? <Text style={{ marginTop: 10, lineHeight: 22 }}>{p.body}</Text> : null}

      {media.length > 0 ? <MediaGallery media={media} /> : null}

      {p.videoUrl ? <Btn label="▶️ Ver vídeo" onPress={() => Linking.openURL(p.videoUrl)} /> : null}

      {p.projectId && p.projectName ? (
        <Card>
          <Text style={u.muted}>Projeto</Text>
          <Text style={u.strong}>📋 {p.projectName}</Text>
          <Btn
            small
            kind="outline"
            label="Ver projeto"
            onPress={() => navigation.navigate(p.isMine ? "NgoProject" : "NgoPublicProject", { id: p.projectId })}
          />
        </Card>
      ) : null}

      <View style={u.row}>
        <Btn small kind="outline" label="📤 Partilhar" onPress={share} />
        {!p.isMine ? (
          <>
            <Btn small kind="outline" label="Ver instituição" onPress={() => navigation.navigate("NgoPublicOrganization", { id: p.ownerId })} />
            <Btn small kind="outline" label="💬 Contactar" onPress={() => navigation.navigate("Chat", { userId: p.ownerId, userName: orgName })} />
          </>
        ) : null}
      </View>

      {p.isMine ? (
        <View style={u.row}>
          <Btn small label="✏️ Editar" onPress={() => navigation.navigate("NgoPublicationForm", { publication: p })} />
          <Btn small kind="outline" label={p.isPublished ? "Passar a rascunho" : "📣 Publicar"} onPress={togglePublished} />
          <Btn small kind="danger" label="Apagar" onPress={remove} />
        </View>
      ) : null}
    </Page>
  );
}
