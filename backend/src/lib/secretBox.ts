import crypto from "crypto";

function key(): Buffer {
  const base = process.env.ADMIN_2FA_KEY || process.env.JWT_SECRET;
  if (!base) {
    throw new Error("Configuração do servidor incompleta: falta a chave de segurança (JWT_SECRET).");
  }
  return crypto.createHash("sha256").update(`admin2fa:${base}`).digest();
}

// Guarda um segredo cifrado (o segredo do 2FA nunca fica em texto simples na base de dados)
export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function open(sealed: string): string {
  const [iv, tag, enc] = String(sealed).split(".");
  if (!iv || !tag || !enc) {
    throw new Error("Segredo inválido.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64")), decipher.final()]).toString("utf8");
}
