import React, { useState } from "react";
import { Text, Alert, View } from "react-native";
import { Card, Btn, Empty, Field, u } from "../ui";
import MediaGallery from "./MediaGallery";
import { addProjectMedia, deleteProjectMedia } from "../../api/ngo";
import { pickImage, uploadImageBase64, pickVideo, uploadVideo } from "../../utils/storage";
import { getApiErrorMessage } from "../../api/errorMessage";

interface Props {
  projectId: string;
  media: any[];
  onBundle: (bundle: any) => void;
}

export default function ProjectMediaTab({ projectId, media, onBundle }: Props) {
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  async function addPhoto(fromCamera: boolean) {
    const picked = await pickImage(fromCamera);
    if (!picked) return;

    setBusy(true);
    try {
      const url = await uploadImageBase64(picked.base64, "projeto-");
      onBundle(await addProjectMedia(projectId, { kind: "IMAGE", url, caption: caption.trim() || undefined }));
      setCaption("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível juntar a foto."));
    } finally {
      setBusy(false);
    }
  }

  async function addVideo(fromCamera: boolean) {
    const picked = await pickVideo(fromCamera);
    if (!picked) return;

    setBusy(true);
    try {
      const url = await uploadVideo(picked.uri, picked.mime);
      onBundle(await addProjectMedia(projectId, { kind: "VIDEO", url, caption: caption.trim() || undefined }));
      setCaption("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível juntar o vídeo."));
    } finally {
      setBusy(false);
    }
  }

  function remove(item: any) {
    Alert.alert("Apagar", `Apagar ${item.kind === "VIDEO" ? "este vídeo" : "esta foto"}?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            onBundle(await deleteProjectMedia(projectId, item.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <View>
      <Card>
        <Text style={u.strong}>Juntar fotos e vídeos</Text>
        <Text style={u.muted}>Mostre o trabalho no terreno. Pode escrever uma legenda antes de escolher o ficheiro.</Text>

        <Field label="Legenda (opcional)" value={caption} onChangeText={setCaption} placeholder="Ex: Entrega de sementes em Sonaco" />

        <View style={u.row}>
          <Btn small kind="outline" label="📷 Foto da galeria" onPress={() => addPhoto(false)} disabled={busy} />
          <Btn small kind="outline" label="📸 Tirar foto" onPress={() => addPhoto(true)} disabled={busy} />
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="🎞️ Vídeo da galeria" onPress={() => addVideo(false)} disabled={busy} />
          <Btn small kind="outline" label="🎥 Gravar vídeo" onPress={() => addVideo(true)} disabled={busy} />
        </View>
        {busy ? <Text style={[u.muted, { marginTop: 6 }]}>A enviar o ficheiro...</Text> : null}
      </Card>

      {media.length === 0 ? <Empty text="Ainda não juntou fotos nem vídeos." /> : <MediaGallery media={media} onDelete={remove} />}
    </View>
  );
}
