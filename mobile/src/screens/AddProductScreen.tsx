import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../api/client";
import { colors } from "../theme/colors";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "../config/supabase";

const CATEGORIES = ["AGRICOLA", "PESCA", "ARTESANATO", "OUTRO"];
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

export default function AddProductScreen({ navigation }: any) {
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

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à galeria para escolher uma foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão", "Permita o acesso à câmera para tirar uma foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.5, base64: true });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
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
    const fileName = `video-${Date.now()}-${Math.floor(Math.random() * 100000)}.mp4`;
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

  const handleSubmit = async () => {
    if (!title || !price || !unit || !quantity) {
      Alert.alert("Erro", "Preencha nome, preço, unidade e quantidade.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageBase64) {
        imageUrl = await uploadImage(imageBase64);
      }

      let videoUrl: string | undefined;
      if (videoUri) {
        videoUrl = await uploadVideo(videoUri, videoMime);
      }

      await api.post("/api/products", {
        title,
        description: description || undefined,
        category,
        price: parseFloat(price.replace(",", ".")),
        unit,
        quantity: parseInt(quantity, 10),
        location: location || undefined,
        imageUrl,
        videoUrl,
      });

      Alert.alert("Sucesso", "Produto cadastrado!");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.error || err?.message || "Não foi possível cadastrar o produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Arroz" />

      <Text style={styles.label}>Descrição (opcional)</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Ex: Arroz da safra nova" multiline />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Preço (FCFA)</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Ex: 500" keyboardType="numeric" />

      <Text style={styles.label}>Unidade</Text>
      <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="Ex: kg, saco, litro" />

      <Text style={styles.label}>Quantidade</Text>
      <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="Ex: 50" keyboardType="numeric" />

      <Text style={styles.label}>Localização (opcional)</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ex: Bissau" />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Enviando..." : "Cadastrar"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background ?? "#fff" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", color: colors.primary, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 15 },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  preview: { width: "100%", height: 200, borderRadius: 8 },
  previewEmpty: { width: "100%", height: 100, borderRadius: 8, borderWidth: 1, borderColor: "#ccc", borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  previewEmptyText: { color: "#888" },
  videoBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.primary, borderRadius: 8, padding: 14 },
  videoText: { color: colors.primary, fontWeight: "600", flex: 1 },
  videoRemove: { color: "#B71C1C", fontWeight: "600", marginLeft: 12 },
  photoRow: { flexDirection: "row", marginTop: 10 },
  photoButton: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginRight: 8 },
  photoButtonText: { color: colors.primary, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: "#333", fontSize: 13 },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  button: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
