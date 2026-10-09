import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "../config/supabase";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const MAX_VIDEO_SECONDS = 30;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

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

export interface PickedImage {
  uri: string;
  base64: string | null;
}

export async function pickImage(
  fromCamera = false,
  aspect: [number, number] = [4, 3]
): Promise<PickedImage | null> {
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!perm.granted) {
    Alert.alert("Permissão", fromCamera ? "Permita o acesso à câmera." : "Permita o acesso à galeria.");
    return null;
  }

  const options = { allowsEditing: true, aspect, quality: 0.5, base64: true };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ["images"] });

  if (result.canceled) return null;
  return { uri: result.assets[0].uri, base64: result.assets[0].base64 ?? null };
}

export async function uploadImageBase64(base64: string, prefix = ""): Promise<string> {
  const fileName = `${prefix}${Date.now()}-${Math.floor(Math.random() * 100000)}.jpg`;
  const body = base64ToArrayBuffer(base64);

  if (body.byteLength < 1000) {
    throw new Error("A foto não foi lida corretamente. Escolha a foto de novo.");
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "image/jpeg" },
    body,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch (e) {}
    throw new Error(`Falha ao enviar a foto (${response.status}). ${detail}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}

export interface PickedVideo {
  uri: string;
  mime: string;
  info: string;
}

export async function pickVideo(fromCamera = false): Promise<PickedVideo | null> {
  const perm = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!perm.granted) {
    Alert.alert("Permissão", fromCamera ? "Permita o acesso à câmera." : "Permita o acesso à galeria.");
    return null;
  }

  const options = { mediaTypes: ["videos"] as ImagePicker.MediaType[], videoMaxDuration: MAX_VIDEO_SECONDS };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) return null;

  const asset = result.assets[0];
  const seconds = asset.duration ? Math.round(asset.duration / 1000) : 0;

  if (seconds > MAX_VIDEO_SECONDS + 2) {
    Alert.alert("Vídeo muito longo", `Escolha um vídeo de até ${MAX_VIDEO_SECONDS} segundos.`);
    return null;
  }
  if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
    Alert.alert("Vídeo muito pesado", "Escolha um vídeo de até 30 MB.");
    return null;
  }

  const mb = asset.fileSize ? ` - ${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : "";
  return {
    uri: asset.uri,
    mime: asset.mimeType || "video/mp4",
    info: `${seconds ? seconds + " s" : "Vídeo"}${mb}`,
  };
}

export async function uploadVideo(uri: string, mime = "video/mp4"): Promise<string> {
  const fileName = `video-${Date.now()}-${Math.floor(Math.random() * 100000)}.mp4`;
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();

  if (blob.size > MAX_VIDEO_BYTES) {
    throw new Error("O vídeo passou de 30 MB. Escolha um vídeo mais curto.");
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": mime || "video/mp4" },
    body: blob,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch (e) {}
    throw new Error(`Falha ao enviar o vídeo (${response.status}). ${detail}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}
