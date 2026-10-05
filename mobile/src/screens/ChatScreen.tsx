import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Alert, Image, Linking, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import { getMessages, sendMessage, deleteMessage } from "../api/messages";
import { reduzirFoto, enviarFoto, enviarArquivo } from "../utils/midia";

// Pacotes opcionais: expo-video (tocar vídeo) e expo-audio (gravar e ouvir áudio).
// Sem eles, o vídeo abre no navegador e o botão de gravar não aparece.
let VideoMod: any = null;
let AudioMod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  VideoMod = require("expo-video");
} catch (e) {
  VideoMod = null;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AudioMod = require("expo-audio");
} catch (e) {
  AudioMod = null;
}

const MAX_VIDEO_SECONDS = 30;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

type Tipo = "foto" | "video" | "audio";

// Mensagem de mídia: primeira linha é o rótulo e a segunda é o link do Storage do Supabase
const MEDIA_RE = /^(📷 Foto|🎬 Vídeo|🎤 Áudio)\n(https:\/\/\S+)$/;
function lerMidia(content: string): { tipo: Tipo; url: string } | null {
  const m = String(content || "").match(MEDIA_RE);
  if (!m) return null;
  if (!m[2].includes(".supabase.co/storage/v1/object/public/")) return null;
  const tipo: Tipo = m[1].startsWith("📷") ? "foto" : m[1].startsWith("🎬") ? "video" : "audio";
  return { tipo, url: m[2] };
}
const ROTULO: Record<Tipo, string> = { foto: "📷 Foto", video: "🎬 Vídeo", audio: "🎤 Áudio" };

const extra: Record<string, Record<string, string>> = {
  pt: {
    deleteTitle: "Apagar mensagem", deleteAsk: "Apagar esta mensagem para todos?", del: "Apagar",
    deleteFail: "Não foi possível apagar a mensagem.",
    photoCamera: "📷 Tirar foto", photoGallery: "🖼️ Foto da galeria", videoCamera: "🎬 Gravar vídeo",
    videoGallery: "📁 Vídeo da galeria", close: "Fechar", sending: "Enviando...",
    recording: "🔴 Gravando... toque no ⏹ para enviar", mediaFail: "Não foi possível enviar. Tente de novo.",
    permTitle: "Permissão", permCamera: "Permita o acesso à câmera.", permGallery: "Permita o acesso à galeria.",
    permMic: "Permita o acesso ao microfone para gravar áudio.",
    videoLong: "Escolha um vídeo de até 30 segundos.", videoHeavy: "Escolha um vídeo de até 30 MB.",
    playVideo: "▶ Ver vídeo", closeVideo: "⏹ Fechar vídeo", playAudio: "▶ Ouvir áudio", pauseAudio: "⏸ Pausar áudio",
  },
  crl: {
    deleteTitle: "Apaga mensaji", deleteAsk: "Apaga e mensaji pa tudu?", del: "Apaga", deleteFail: "Ka konsigi apaga mensaji.",
    photoCamera: "📷 Tira foto", photoGallery: "🖼️ Foto di galeria", videoCamera: "🎬 Grava vídeu",
    videoGallery: "📁 Vídeu di galeria", close: "Fecha", sending: "Na manda...",
    recording: "🔴 Na grava... toka na ⏹ pa manda", mediaFail: "Ka konsigi manda. Tenta di novu.",
    permTitle: "Pirmison", permCamera: "Dexa kamara abri.", permGallery: "Dexa galeria abri.",
    permMic: "Dexa mikrofoni abri pa grava áudiu.",
    videoLong: "Skodje un vídeu di até 30 sigundu.", videoHeavy: "Skodje un vídeu di até 30 MB.",
    playVideo: "▶ Odja vídeu", closeVideo: "⏹ Fecha vídeu", playAudio: "▶ Obi áudiu", pauseAudio: "⏸ Para áudiu",
  },
  fr: {
    deleteTitle: "Supprimer le message", deleteAsk: "Supprimer ce message pour tous ?", del: "Supprimer",
    deleteFail: "Impossible de supprimer le message.",
    photoCamera: "📷 Prendre une photo", photoGallery: "🖼️ Photo de la galerie", videoCamera: "🎬 Filmer une vidéo",
    videoGallery: "📁 Vidéo de la galerie", close: "Fermer", sending: "Envoi...",
    recording: "🔴 Enregistrement... touchez ⏹ pour envoyer", mediaFail: "Envoi impossible. Réessayez.",
    permTitle: "Autorisation", permCamera: "Autorisez l'accès à la caméra.", permGallery: "Autorisez l'accès à la galerie.",
    permMic: "Autorisez le microphone pour enregistrer un audio.",
    videoLong: "Choisissez une vidéo de 30 secondes maximum.", videoHeavy: "Choisissez une vidéo de 30 Mo maximum.",
    playVideo: "▶ Voir la vidéo", closeVideo: "⏹ Fermer la vidéo", playAudio: "▶ Écouter l'audio", pauseAudio: "⏸ Pause",
  },
};

// ---------- vídeo e áudio dentro do chat ----------
function TocadorVideo({ url }: { url: string }) {
  const player = VideoMod.useVideoPlayer(url, (p: any) => {
    p.loop = false;
    p.play();
  });
  return <VideoMod.VideoView player={player} style={s.video} allowsFullscreen nativeControls />;
}

function AudioBolha({ url, cor, tocar, pausar }: { url: string; cor: string; tocar: string; pausar: string }) {
  const player = AudioMod.useAudioPlayer(url);
  const status = AudioMod.useAudioPlayerStatus(player);
  const alternar = async () => {
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      if (status.duration > 0 && status.currentTime >= status.duration - 0.2) {
        await player.seekTo(0);
      }
      player.play();
    } catch (e) {
      Linking.openURL(url);
    }
  };
  return (
    <TouchableOpacity onPress={alternar}>
      <Text style={{ color: cor, fontWeight: "600" }}>{status.playing ? pausar : tocar}</Text>
    </TouchableOpacity>
  );
}

function BotaoGravar({
  onPronto, onEstado, desativado, textoPermissao,
}: {
  onPronto: (uri: string) => void;
  onEstado: (gravando: boolean) => void;
  desativado: boolean;
  textoPermissao: string;
}) {
  const gravador = AudioMod.useAudioRecorder(AudioMod.RecordingPresets.HIGH_QUALITY);
  const [gravando, setGravando] = useState(false);

  const alternar = async () => {
    try {
      if (!gravando) {
        const perm = await AudioMod.AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("", textoPermissao);
          return;
        }
        await AudioMod.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await gravador.prepareToRecordAsync();
        gravador.record();
        setGravando(true);
        onEstado(true);
      } else {
        await gravador.stop();
        setGravando(false);
        onEstado(false);
        await AudioMod.setAudioModeAsync({ allowsRecording: false });
        if (gravador.uri) onPronto(gravador.uri);
      }
    } catch (e) {
      setGravando(false);
      onEstado(false);
    }
  };

  return (
    <TouchableOpacity
      style={[s.mic, gravando && { backgroundColor: "#B71C1C" }, desativado && { opacity: 0.5 }]}
      onPress={alternar}
      disabled={desativado}
    >
      <Text style={s.sendText}>{gravando ? "⏹" : "🎤"}</Text>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const route = useRoute<any>();
  const { userId } = route.params;
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tr = (key: string) => extra[language]?.[key] ?? extra.pt[key] ?? key;
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [videoAbertoId, setVideoAbertoId] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await getMessages(userId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Erro ao carregar mensagens", err);
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function handleSend() {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    setError("");
    try {
      await sendMessage(userId, content);
      loadMessages();
    } catch (err: any) {
      setText(content);
      setError(err?.response?.data?.error || err?.response?.data?.message || t("sendError"));
    }
  }

  async function enviarMidia(tipo: Tipo, uri: string, base64?: string | null, mime?: string) {
    setEnviando(true);
    setError("");
    try {
      let url: string;
      if (tipo === "foto") {
        if (!base64) throw new Error(tr("mediaFail"));
        url = await enviarFoto(base64);
      } else if (tipo === "video") {
        url = await enviarArquivo(uri, mime || "video/mp4", "video", MAX_VIDEO_BYTES);
      } else {
        url = await enviarArquivo(uri, "audio/mp4", "audio", MAX_AUDIO_BYTES);
      }
      await sendMessage(userId, `${ROTULO[tipo]}\n${url}`);
      loadMessages();
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.error || tr("mediaFail"));
    } finally {
      setEnviando(false);
    }
  }

  async function escolherFoto(camera: boolean) {
    setMenu(false);
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(tr("permTitle"), camera ? tr("permCamera") : tr("permGallery"));
      return;
    }
    const opcoes: any = { mediaTypes: ["images"], quality: 0.5, base64: true };
    const r = camera
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled) return;
    const a = r.assets[0];
    const reduzida = await reduzirFoto(a.uri, a.base64 ?? null);
    await enviarMidia("foto", reduzida.uri, reduzida.base64);
  }

  async function escolherVideo(camera: boolean) {
    setMenu(false);
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(tr("permTitle"), camera ? tr("permCamera") : tr("permGallery"));
      return;
    }
    const opcoes: any = { mediaTypes: ["videos"], videoMaxDuration: MAX_VIDEO_SECONDS };
    const r = camera
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled) return;
    const a = r.assets[0];
    const segundos = a.duration ? Math.round(a.duration / 1000) : 0;
    if (segundos > MAX_VIDEO_SECONDS + 2) {
      Alert.alert(tr("permTitle"), tr("videoLong"));
      return;
    }
    if (a.fileSize && a.fileSize > MAX_VIDEO_BYTES) {
      Alert.alert(tr("permTitle"), tr("videoHeavy"));
      return;
    }
    await enviarMidia("video", a.uri, null, a.mimeType || "video/mp4");
  }

  function askDelete(item: Message) {
    Alert.alert(tr("deleteTitle"), tr("deleteAsk"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: tr("del"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMessage(item.id);
            setMessages((prev) => prev.filter((m) => m.id !== item.id));
          } catch (err: any) {
            Alert.alert(t("error"), err?.response?.data?.error || tr("deleteFail"));
          }
        },
      },
    ]);
  }

  function conteudoDaMensagem(item: Message, isMine: boolean) {
    const cor = isMine ? colors.white : colors.text;
    const midia = lerMidia(item.content);
    if (!midia) {
      return <Text style={isMine ? s.textMine : s.textTheirs}>{item.content}</Text>;
    }
    if (midia.tipo === "foto") {
      return (
        <TouchableOpacity onPress={() => Linking.openURL(midia.url)}>
          <Image source={{ uri: midia.url }} style={s.foto} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (midia.tipo === "video") {
      const aberto = videoAbertoId === item.id;
      return (
        <View>
          {aberto && VideoMod ? <TocadorVideo url={midia.url} /> : null}
          <TouchableOpacity
            onPress={() => (VideoMod ? setVideoAbertoId(aberto ? null : item.id) : Linking.openURL(midia.url))}
          >
            <Text style={{ color: cor, fontWeight: "600" }}>
              {aberto && VideoMod ? tr("closeVideo") : tr("playVideo")}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    // áudio
    if (AudioMod) {
      return <AudioBolha url={midia.url} cor={cor} tocar={tr("playAudio")} pausar={tr("pauseAudio")} />;
    }
    return (
      <TouchableOpacity onPress={() => Linking.openURL(midia.url)}>
        <Text style={{ color: cor, fontWeight: "600" }}>{tr("playAudio")}</Text>
      </TouchableOpacity>
    );
  }

  const podeGravar = !!AudioMod && !text.trim();

  return (
    <KeyboardAvoidingView style={s.container} behavior="padding">
      <FlatList
        ref={listRef}
        data={messages}
        extraData={videoAbertoId}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={s.empty}>{t("noMessages")}</Text>}
        renderItem={({ item }) => {
          const isMine = String(item.senderId) === String(user?.id);
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={isMine ? () => askDelete(item) : undefined}
              style={[s.bubble, isMine ? s.mine : s.theirs]}
            >
              {conteudoDaMensagem(item, isMine)}
            </TouchableOpacity>
          );
        }}
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      {enviando ? (
        <View style={s.statusRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.statusText}>{tr("sending")}</Text>
        </View>
      ) : null}
      {gravando ? (
        <View style={s.statusRow}>
          <Text style={s.statusText}>{tr("recording")}</Text>
        </View>
      ) : null}

      {menu && !gravando ? (
        <View style={s.menu}>
          <TouchableOpacity style={s.menuItem} onPress={() => escolherFoto(true)}>
            <Text style={s.menuText}>{tr("photoCamera")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => escolherFoto(false)}>
            <Text style={s.menuText}>{tr("photoGallery")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => escolherVideo(true)}>
            <Text style={s.menuText}>{tr("videoCamera")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => escolherVideo(false)}>
            <Text style={s.menuText}>{tr("videoGallery")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => setMenu(false)}>
            <Text style={[s.menuText, { color: colors.textSecondary }]}>{tr("close")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[s.inputRow, { paddingBottom: 10 + insets.bottom }]}>
        <TouchableOpacity
          style={[s.clip, (enviando || gravando) && { opacity: 0.5 }]}
          onPress={() => setMenu(!menu)}
          disabled={enviando || gravando}
        >
          <Text style={s.clipText}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={s.input}
          placeholder={t("chatPlaceholder")}
          value={text}
          onChangeText={setText}
          multiline
          editable={!gravando}
        />
        {podeGravar ? (
          <BotaoGravar
            desativado={enviando}
            textoPermissao={tr("permMic")}
            onEstado={setGravando}
            onPronto={(uri) => enviarMidia("audio", uri)}
          />
        ) : (
          <TouchableOpacity style={s.send} onPress={handleSend}>
            <Text style={s.sendText}>{t("send")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  error: { color: "#B71C1C", textAlign: "center", paddingHorizontal: 12, paddingVertical: 6 },
  bubble: { maxWidth: "75%", padding: 10, borderRadius: 12, marginBottom: 8 },
  mine: { backgroundColor: colors.primary, alignSelf: "flex-end" },
  theirs: { backgroundColor: colors.surface, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border },
  textMine: { color: colors.white },
  textTheirs: { color: colors.text },
  foto: { width: 220, height: 160, borderRadius: 8, backgroundColor: "#ddd" },
  video: { width: 220, height: 160, borderRadius: 8, backgroundColor: "#000", marginBottom: 6 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  statusText: { color: colors.textSecondary, marginLeft: 8 },
  menu: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { fontSize: 15, color: colors.text, fontWeight: "600" },
  inputRow: { flexDirection: "row", padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, alignItems: "flex-end" },
  clip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 10, justifyContent: "center", alignItems: "center", marginRight: 6 },
  clipText: { fontSize: 20 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxHeight: 100 },
  send: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center", alignItems: "center" },
  mic: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center", alignItems: "center" },
  sendText: { color: colors.white, fontWeight: "bold" },
});
