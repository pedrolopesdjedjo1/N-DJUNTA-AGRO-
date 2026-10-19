import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createPublication, updatePublication, listNgoProjects } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { pickImage, uploadImageBase64, pickVideo, uploadVideo } from "../utils/storage";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { PUBLICATION_ICON } from "../constants/ngoContent";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

interface Photo {
  key: string;
  uri: string;
  base64?: string;
}

const MAX_PHOTOS = 10;

export default function NgoPublicationFormScreen({ navigation, route }: any) {
  const editing = route?.params?.publication;
  const catalog = useNgoCatalog();

  const [kind, setKind] = useState<string>(editing?.kind ?? "NOTICIA");
  const [title, setTitle] = useState<string>(editing?.title ?? "");
  const [body, setBody] = useState<string>(editing?.body ?? "");
  const [photos, setPhotos] = useState<Photo[]>(
    (editing?.imageUrls ?? []).map((url: string, i: number) => ({ key: `old-${i}`, uri: url }))
  );
  const [videoUrl, setVideoUrl] = useState<string>(editing?.videoUrl ?? "");
  const [videoNote, setVideoNote] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [projectId, setProjectId] = useState<string>(editing?.projectId ?? route?.params?.projectId ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? "");
  const [communityName, setCommunityName] = useState<string>(editing?.communityName ?? "");
  const [isPublished, setIsPublished] = useState<boolean>(editing ? !!editing.isPublished : true);
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loader = useLoader(async () => ((await listNgoProjects()) as any).projects as any[], [] as any[]);
  const projects: any[] = loader.data;

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  async function addPhoto(fromCamera: boolean) {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Atenção", `Pode juntar até ${MAX_PHOTOS} fotos.`);
      return;
    }
    const picked = await pickImage(fromCamera);
    if (picked) {
      setPhotos((prev) => [...prev, { key: `new-${Date.now()}-${prev.length}`, uri: picked.uri, base64: picked.base64 }]);
    }
  }

  async function addVideo(fromCamera: boolean) {
    setVideoBusy(true);
    try {
      const picked = await pickVideo(fromCamera);
      if (picked) {
        setVideoUrl(await uploadVideo(picked.uri, picked.mime));
        setVideoNote("Vídeo enviado ✔️");
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o vídeo."));
    } finally {
      setVideoBusy(false);
    }
  }

  async function save() {
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o título da publicação.");
      return;
    }
    if (kind === "FOTO" && photos.length === 0) {
      Alert.alert("Atenção", "Junte pelo menos uma fotografia.");
      return;
    }
    if (kind === "VIDEO" && !videoUrl.trim()) {
      Alert.alert("Atenção", "Envie o vídeo ou escreva o endereço (https://...).");
      return;
    }
    if (kind !== "FOTO" && kind !== "VIDEO" && body.trim().length < 10) {
      Alert.alert("Atenção", "Escreva o texto da publicação (pelo menos 10 letras).");
      return;
    }
    if (videoUrl.trim() && !/^https:\/\/\S+$/i.test(videoUrl.trim())) {
      Alert.alert("Atenção", "O endereço do vídeo deve começar por https://");
      return;
    }

    setSaving(true);
    try {
      const imageUrls: string[] = [];
      for (const photo of photos) {
        imageUrls.push(photo.base64 ? await uploadImageBase64(photo.base64, "publicacao-") : photo.uri);
      }

      const payload: Record<string, any> = {
        kind,
        title: title.trim(),
        body: body.trim(),
        imageUrls,
        videoUrl: videoUrl.trim(),
        projectId: projectId || "",
        region: region.trim(),
        communityName: communityName.trim(),
        isPublished,
      };

      if (editing) {
        await updatePublication(editing.id, payload);
        Alert.alert("Pronto", "Publicação atualizada.");
        navigation.goBack();
      } else {
        const created = await createPublication(payload);
        if (isPublished) Alert.alert("Publicada", "As pessoas que seguem a organização foram avisadas.");
        if (created?.id && navigation.replace) navigation.replace("NgoPublication", { id: created.id });
        else navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a publicação."));
    } finally {
      setSaving(false);
    }
  }

  const needsBody = kind !== "FOTO" && kind !== "VIDEO";

  return (
    <Page loader={loader}>
      <Title>{editing ? "✏️ Editar publicação" : "📰 Nova publicação"}</Title>

      <ChipGroup
        label="Tipo de publicação"
        options={catalog.publicationKinds.map((k) => ({ ...k, icon: PUBLICATION_ICON[k.value] }))}
        value={kind}
        onChange={setKind}
      />

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: 200 famílias de Sonaco já têm sementes" />
      <Field
        label={needsBody ? "Texto" : "Texto (opcional)"}
        value={body}
        onChangeText={setBody}
        multiline
        placeholder={kind === "HISTORIA" ? "Conte a história da pessoa ou da comunidade, com o seu consentimento" : "Conte o que aconteceu"}
      />

      <Text style={u.label}>📸 Fotografias (até {MAX_PHOTOS})</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {photos.map((p) => (
          <View key={p.key} style={{ marginRight: 10, marginBottom: 10 }}>
            <Image source={{ uri: p.uri }} style={{ width: 90, height: 90, borderRadius: 8 }} />
            <Btn small kind="danger" label="Tirar" onPress={() => setPhotos((prev) => prev.filter((x) => x.key !== p.key))} />
          </View>
        ))}
      </View>
      <View style={u.row}>
        <Btn small kind="outline" label="📷 Da galeria" onPress={() => addPhoto(false)} />
        <Btn small kind="outline" label="📸 Tirar foto" onPress={() => addPhoto(true)} />
      </View>

      <Text style={u.label}>🎬 Vídeo</Text>
      <View style={u.row}>
        <Btn small kind="outline" label="🎞️ Da galeria" onPress={() => addVideo(false)} disabled={videoBusy} />
        <Btn small kind="outline" label="🎥 Gravar" onPress={() => addVideo(true)} disabled={videoBusy} />
        {videoUrl ? (
          <Btn
            small
            kind="danger"
            label="Tirar vídeo"
            onPress={() => {
              setVideoUrl("");
              setVideoNote("");
            }}
          />
        ) : null}
      </View>
      {videoBusy ? <Text style={u.muted}>A enviar o vídeo...</Text> : null}
      {videoNote ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>{videoNote}</Text> : null}
      <Field
        label="Ou o endereço de um vídeo (https://...)"
        value={videoNote ? "" : videoUrl}
        onChangeText={(v) => {
          setVideoNote("");
          setVideoUrl(v);
        }}
        autoCapitalize="none"
        placeholder="https://..."
      />
      {editing?.videoUrl && videoUrl === editing.videoUrl && !videoNote ? <Text style={u.muted}>Esta publicação já tem um vídeo.</Text> : null}

      {projects.length > 0 ? (
        <>
          <Text style={u.label}>Projeto (opcional)</Text>
          <View style={u.row}>
            <Chip label="Nenhum" active={projectId === ""} onPress={() => setProjectId("")} />
            {projects.map((p) => (
              <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
            ))}
          </View>
          {projectId ? <Text style={u.muted}>Os beneficiários deste projeto que têm conta no app recebem um aviso.</Text> : null}
        </>
      ) : null}

      <Field label="Região (opcional)" value={region} onChangeText={setRegion} placeholder="Ex: Gabú" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Field label="Comunidade (opcional)" value={communityName} onChangeText={setCommunityName} placeholder="Ex: Sonaco" />

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>{isPublished ? "Publicar agora" : "Guardar como rascunho"}</Text>
            <Text style={u.muted}>
              {isPublished
                ? "Aparece a todas as pessoas no app. Quem segue a organização é avisado."
                : "Só a sua organização vê. Pode publicar mais tarde."}
            </Text>
          </View>
          <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      </Card>

      <Text style={[u.muted, { marginTop: 8 }]}>
        Antes de publicar fotos e histórias de pessoas, peça sempre o consentimento delas. Evite mostrar crianças ou dados pessoais.
      </Text>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : isPublished ? "Publicar" : "Guardar rascunho"} onPress={save} disabled={saving || videoBusy} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
