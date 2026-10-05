// mobile/src/utils/midia.ts
// Envio de fotos, vídeos e áudios para o Supabase Storage (mesmo bucket das fotos de produto).
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from "../config/supabase";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
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
export async function reduzirFoto(uri: string, base64: string | null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const M = require("expo-image-manipulator");
    const r = await M.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
      compress: 0.6,
      format: M.SaveFormat.JPEG,
      base64: true,
    });
    return { uri: r.uri as string, base64: ((r.base64 as string) ?? base64) as string | null };
  } catch (e) {
    return { uri, base64 };
  }
}

async function enviar(fileName: string, body: any, mime: string, rotulo: string): Promise<string> {
  const resposta = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": mime },
    body,
  });
  if (!resposta.ok) {
    let detalhe = "";
    try {
      detalhe = await resposta.text();
    } catch (e) {}
    throw new Error(`Falha ao enviar ${rotulo} (${resposta.status}). ${detalhe}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}

const nomeUnico = (prefixo: string, ext: string) =>
  `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;

export async function enviarFoto(base64: string): Promise<string> {
  const body = base64ToArrayBuffer(base64);
  if (body.byteLength < 1000) {
    throw new Error("A foto não foi lida corretamente. Escolha a foto de novo.");
  }
  return enviar(nomeUnico("chat-foto", "jpg"), body, "image/jpeg", "a foto");
}

export async function enviarArquivo(
  uri: string,
  mime: string,
  tipo: "video" | "audio",
  maxBytes: number
): Promise<string> {
  const resposta = await fetch(uri);
  const blob = await resposta.blob();
  if (blob.size > maxBytes) {
    throw new Error(`O arquivo passou de ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }
  const ext = tipo === "audio" ? "m4a" : String(mime).includes("quicktime") ? "mov" : "mp4";
  const tipoMime = tipo === "audio" ? "audio/mp4" : mime || "video/mp4";
  return enviar(nomeUnico(`chat-${tipo}`, ext), blob, tipoMime, tipo === "audio" ? "o áudio" : "o vídeo");
}
