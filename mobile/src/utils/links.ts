// Endereço de uma rede social a partir de um link ou de um nome de utilizador
export function socialUrl(kind: "facebook" | "instagram", value?: string | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;

  const handle = v.replace(/^@/, "").replace(/^(www\.)?(facebook|instagram)\.com\//i, "");
  return kind === "facebook" ? `https://www.facebook.com/${handle}` : `https://www.instagram.com/${handle}`;
}

// Endereço do WhatsApp (os números da Guiné-Bissau levam o 245 à frente)
export function whatsappUrl(phone?: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;

  const full = digits.startsWith("245") ? digits : digits.length <= 9 ? `245${digits}` : digits;
  return `https://wa.me/${full}`;
}
