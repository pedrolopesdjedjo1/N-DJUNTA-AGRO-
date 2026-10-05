import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../api/client";
import { colors } from "../theme/colors";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "../config/supabase";
import { useAparencia } from "../context/AparenciaContext";

const CATEGORIES = ["AGRICOLA", "PESCA", "ARTESANATO", "OUTRO"];
const UNITS = ["kg", "saco", "litro", "unidade", "caixa"];
const REGIONS = ["Bissau", "Biombo", "Cacheu", "Oio", "Bafatá", "Gabú", "Quinara", "Tombali", "Bolama"];
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const MAX_VIDEO_SECONDS = 30;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = B64.indexOf(clean[i]);
    const e2 = B64.indexOf(clean[i + 1]);
    const e3 = i + 2 < len ? B64.indexOf(clean[i + 2]) : 0;
    const e4 = i + 3 < len ? B64.indexOf(clean[i + 3]) : 0;
    if (p < bytes.length) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bytes.length) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bytes.length) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes.buffer;
}

// Reduz a foto (1024 px de largura) para gastar menos dados.
// Precisa do pacote expo-image-manipulator. Se não estiver instalado, usa a foto original.
async function reduzirFoto(uri: string, base64: string | null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const M = require("expo-image-manipulator");
    const r = await M.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
      compress: 0.6,
      format: M.SaveFormat.JPEG,
      base64: true,
    });
    return { uri: r.uri as string, base64: (r.base64 as string) ?? base64 };
  } catch (e) {
    return { uri, base64 };
  }
}

export default function AddProductScreen({ navigation }: any) {
  const { cores, escala, escuro } = useAparencia();
  const primary = escuro ? cores.verde : colors.primary;
  const styles = useMemo(() => makeStyles(cores, escala, primary), [cores, escala, primary]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("AGRICOLA");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoMime, setVideoMime] = useState<string>("video/mp4");
  const [videoInfo, setVideoInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");

  const guardarFoto = async (asset: ImagePicker.ImagePickerAsset) => {
    const r = await reduzirFoto(asset.uri, asset.base64 ?? null);
    setImageUri(r.uri);
    setImageBase64(r.base64 ?? null);
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à galeria para escolher uma foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
    if (!result.canceled) await guardarFoto(result.assets[0]);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à câmera para tirar uma foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
    if (!result.canceled) await guardarFoto(result.assets[0]);
  };

  const acceptVideo = (asset: ImagePicker.ImagePickerAsset) => {
    const seconds = asset.duration ? Math.round(asset.duration / 1000) : 0;
    if (seconds > MAX_VIDEO_SECONDS + 2) {
      Alert.alert("Vídeo muito longo", `Escolha um vídeo de até ${MAX_VIDEO_SECONDS} segundos.`);
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
      Alert.alert("Vídeo muito pesado", "Escolha um vídeo de até 30 MB.");
      return;
    }
    const mb = asset.fileSize ? ` - ${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : "";
    setVideoUri(asset.uri);
    setVideoMime(asset.mimeType || "video/mp4");
    setVideoInfo(`${seconds ? seconds + " s" : "Vídeo"}${mb}`);
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à galeria para escolher um vídeo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], videoMaxDuration: MAX_VIDEO_SECONDS });
    if (!result.canceled) acceptVideo(result.assets[0]);
  };

  const recordVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à câmera para gravar um vídeo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: MAX_VIDEO_SECONDS });
    if (!result.canceled) acceptVideo(result.assets[0]);
  };

  const removeVideo = () => {
    setVideoUri(null);
    setVideoInfo("");
  };

  const uploadImage = async (base64: string): Promise<string> => {
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 100000)}.jpg`;
    const body = base64ToArrayBuffer(base64);
    if (body.byteLength < 1000) {
      throw new Error("A foto não foi lida corretamente. Escolha a foto de novo.");
    }
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "image/jpeg" },
      body,
    });
    if (!uploadResponse.ok) {
      let detail = "";
      try {
        detail = await uploadResponse.text();
      } catch (e) {}
      throw new Error(`Falha ao enviar a foto (${uploadResponse.status}). ${detail}`);
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  };

  const uploadVideo = async (uri: string, mime: string): Promise<string> => {
    const ext = String(mime || "").includes("quicktime") ? "mov" : "mp4";
    const fileName = `video-${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();
    if (blob.size > MAX_VIDEO_BYTES) {
      throw new Error("O vídeo passou de 30 MB. Escolha um vídeo mais curto.");
    }
    const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": mime || "video/mp4" },
      body: blob,
    });
    if (!uploadResponse.ok) {
      let detail = "";
      try {
        detail = await uploadResponse.text();
      } catch (e) {}
      throw new Error(`Falha ao enviar o vídeo (${uploadResponse.status}). ${detail}`);
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  };

  // Quando o vídeo falha, pergunta se pode publicar só com a foto
  const publicarSemVideo = (motivo: string) =>
    new Promise<boolean>((resolve) => {
      Alert.alert("O vídeo não foi enviado", `${motivo}\n\nQuer publicar o produto sem o vídeo?`, [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: "Publicar sem vídeo", onPress: () => resolve(true) },
      ]);
    });

  const handleSubmit = async () => {
    if (!title.trim() || !price.trim() || !unit.trim() || !quantity.trim()) {
      Alert.alert("Erro", "Preencha nome, preço, unidade e quantidade.");
      return;
    }
    const precoNum = parseFloat(price.replace(",", "."));
    const quantidadeNum = parseInt(quantity, 10);
    if (!Number.isFinite(precoNum) || precoNum <= 0) {
      Alert.alert("Erro", "O preço precisa ser um número maior que zero.");
      return;
    }
    if (!Number.isFinite(quantidadeNum) || quantidadeNum <= 0) {
      Alert.alert("Erro", "A quantidade precisa ser um número maior que zero.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageBase64) {
        setEtapa("Enviando a foto...");
        imageUrl = await uploadImage(imageBase64);
      }

      let videoUrl: string | undefined;
      if (videoUri) {
        setEtapa("Enviando o vídeo... pode demorar um pouco.");
        try {
          videoUrl = await uploadVideo(videoUri, videoMime);
        } catch (e: any) {
          const seguir = await publicarSemVideo(e?.message || "Erro desconhecido.");
          if (!seguir) return;
        }
      }

      setEtapa("Publicando o produto...");
      await api.post("/api/products", {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        price: precoNum,
        unit: unit.trim(),
        quantity: quantidadeNum,
        location: location.trim() || undefined,
        imageUrl,
        videoUrl,
      });

      Alert.alert("Sucesso", "Produto cadastrado!");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.error || err?.message || "Não foi possível cadastrar o produto.");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Cadastrar Produto</Text>

      <Text style={styles.label}>Foto do produto</Text>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.previewEmpty}>
          <Text style={styles.previewEmptyText}>Nenhuma foto escolhida</Text>
        </View>
      )}
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoButton} onPress={pickFromGallery}>
          <Text style={styles.photoButtonText}>Galeria</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>Câmera</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Vídeo do produto (opcional, até 30 segundos)</Text>
      {videoUri ? (
        <View style={styles.videoBox}>
          <Text style={styles.videoText}>🎬 Vídeo escolhido ({videoInfo})</Text>
          <TouchableOpacity onPress={removeVideo}>
            <Text style={styles.videoRemove}>Remover</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewEmpty}>
          <Text style={styles.previewEmptyText}>Nenhum vídeo escolhido</Text>
        </View>
      )}
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoButton} onPress={pickVideo}>
          <Text style={styles.photoButtonText}>Escolher vídeo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={recordVideo}>
          <Text style={styles.photoButtonText}>Gravar vídeo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Nome do produto</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Arroz" placeholderTextColor={cores.suave} />

      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Ex: Arroz da safra nova"
        placeholderTextColor={cores.suave}
        multiline
      />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Preço (FCFA)</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Ex: 500" placeholderTextColor={cores.suave} keyboardType="numeric" />

      <Text style={styles.label}>Unidade</Text>
      <View style={styles.chipRow}>
        {UNITS.map((u) => (
          <TouchableOpacity key={u} style={[styles.chip, unit === u && styles.chipActive]} onPress={() => setUnit(u)}>
            <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="Ou escreva a unidade" placeholderTextColor={cores.suave} />

      <Text style={styles.label}>Quantidade</Text>
      <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="Ex: 50" placeholderTextColor={cores.suave} keyboardType="numeric" />

      <Text style={styles.label}>Localização (opcional)</Text>
      <View style={styles.chipRow}>
        {REGIONS.map((r) => (
          <TouchableOpacity key={r} style={[styles.chip, location === r && styles.chipActive]} onPress={() => setLocation(r)}>
            <Text style={[styles.chipText, location === r && styles.chipTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ou escreva a localização" placeholderTextColor={cores.suave} />

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Enviando..." : "Cadastrar"}</Text>
      </TouchableOpacity>
      {etapa ? <Text style={styles.etapa}>{etapa}</Text> : null}
    </ScrollView>
  );
}

function makeStyles(c: any, e: number, primary: string) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.fundo },
    content: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 22 * e, fontWeight: "bold", color: primary, marginBottom: 20 },
    label: { fontSize: 14 * e, fontWeight: "600", marginBottom: 6, marginTop: 12, color: c.texto },
    input: { borderWidth: 1, borderColor: c.borda, borderRadius: 8, padding: 12, fontSize: 15 * e, color: c.texto, backgroundColor: c.fundo },
    multiline: { minHeight: 70, textAlignVertical: "top" },
    preview: { width: "100%", height: 200, borderRadius: 8 },
    previewEmpty: { width: "100%", height: 100, borderRadius: 8, borderWidth: 1, borderColor: c.borda, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
    previewEmptyText: { color: c.suave, fontSize: 14 * e },
    videoBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: primary, borderRadius: 8, padding: 14 },
    videoText: { color: primary, fontWeight: "600", flex: 1, fontSize: 14 * e },
    videoRemove: { color: "#B71C1C", fontWeight: "600", marginLeft: 12, fontSize: 14 * e },
    photoRow: { flexDirection: "row", marginTop: 10 },
    photoButton: { flex: 1, borderWidth: 1, borderColor: primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginRight: 8 },
    photoButtonText: { color: primary, fontWeight: "600", fontSize: 14 * e },
    chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
    chip: { borderWidth: 1, borderColor: c.borda, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
    chipActive: { backgroundColor: primary, borderColor: primary },
    chipText: { color: c.texto, fontSize: 13 * e },
    chipTextActive: { color: "#fff", fontWeight: "600" },
    button: { backgroundColor: primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
    buttonText: { color: "#fff", fontSize: 16 * e, fontWeight: "600" },
    etapa: { textAlign: "center", color: c.suave, marginTop: 10, fontSize: 14 * e },
  });
}
