import { prisma } from "./prisma";

export interface SettingDef {
  key: string;
  label: string;
  group: string;
  type: "string" | "text" | "url" | "number" | "boolean" | "list";
  default: any;
  perm: string;
  min?: number;
  max?: number;
  maxLength?: number;
  options?: string[];
  hint?: string;
}

export const SETTING_DEFS: SettingDef[] = [
  { key: "platform.name", label: "Nome da plataforma", group: "Plataforma", type: "string", default: "NÔDJUNTA AGRO", perm: "settings.manage", maxLength: 60 },
  { key: "platform.logoUrl", label: "Logo", group: "Plataforma", type: "url", default: "", perm: "settings.manage", maxLength: 300, hint: "Endereço da imagem (https). Deixe vazio para usar o logo do app." },
  { key: "platform.languages", label: "Idiomas disponíveis", group: "Plataforma", type: "list", default: ["pt"], perm: "settings.manage", options: ["pt", "kri", "en", "fr"] },
  { key: "support.email", label: "E-mail do suporte", group: "Suporte", type: "string", default: "nodjunta.gb@gmail.com", perm: "settings.manage", maxLength: 120 },
  { key: "support.phones", label: "Telefones do suporte", group: "Suporte", type: "list", default: ["955407156", "965281785"], perm: "settings.manage" },
  { key: "notifications.maxBroadcastRecipients", label: "Máximo de pessoas por aviso geral", group: "Notificações", type: "number", default: 5000, perm: "settings.manage", min: 100, max: 20000 },
  { key: "commissions.platformPercent", label: "Comissão da plataforma (%)", group: "Comissões", type: "number", default: 0, perm: "finance.manage", min: 0, max: 30, hint: "Usada nos relatórios financeiros. O app não cobra dinheiro." },
  { key: "finance.suspiciousOrderAmount", label: "Valor a partir do qual uma encomenda é revista (FCFA)", group: "Comissões", type: "number", default: 500000, perm: "finance.manage", min: 0, max: 1000000000 },
  { key: "delivery.stuckDays", label: "Dias parada até a encomenda ser sinalizada", group: "Entregas", type: "number", default: 3, perm: "settings.manage", min: 1, max: 30 },
  { key: "market.newProductReviewHours", label: "Horas em que um produto novo está para revisão", group: "Mercado", type: "number", default: 72, perm: "settings.manage", min: 1, max: 336 },
  { key: "legal.terms", label: "Termos e condições", group: "Textos legais", type: "text", default: "", perm: "settings.manage", maxLength: 20000 },
  { key: "legal.privacy", label: "Política de privacidade", group: "Textos legais", type: "text", default: "", perm: "settings.manage", maxLength: 20000 },
  { key: "security.require2fa", label: "Exigir autenticação de dois fatores a todos os administradores", group: "Segurança", type: "boolean", default: false, perm: "security.manage" },
  { key: "security.sessionHours", label: "Duração de uma sessão de administrador (horas)", group: "Segurança", type: "number", default: 8, perm: "security.manage", min: 1, max: 24 },
  { key: "security.maxFailedAttempts", label: "Códigos errados até bloquear o acesso", group: "Segurança", type: "number", default: 5, perm: "security.manage", min: 3, max: 10 },
  { key: "security.lockMinutes", label: "Minutos de bloqueio depois de errar o código", group: "Segurança", type: "number", default: 15, perm: "security.manage", min: 5, max: 240 },
];

const CACHE_MS = 30000;
let cache: { at: number; values: Map<string, any> } | null = null;

async function loadAll(): Promise<Map<string, any>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.values;

  const rows = await prisma.platformSetting.findMany();
  const values = new Map<string, any>(rows.map((r) => [r.key, r.value]));
  cache = { at: Date.now(), values };
  return values;
}

export function forgetSettings() {
  cache = null;
}

export function defOf(key: string): SettingDef | undefined {
  return SETTING_DEFS.find((d) => d.key === key);
}

export async function getSetting<T = any>(key: string): Promise<T> {
  const def = defOf(key);
  const values = await loadAll();
  return (values.has(key) ? values.get(key) : def?.default) as T;
}

export async function allSettings(): Promise<{ def: SettingDef; value: any; custom: boolean }[]> {
  const values = await loadAll();
  return SETTING_DEFS.map((def) => ({ def, value: values.has(def.key) ? values.get(def.key) : def.default, custom: values.has(def.key) }));
}

// Valida o valor recebido e devolve-o no formato certo
export function coerce(def: SettingDef, input: any): any {
  switch (def.type) {
    case "boolean": {
      if (input === true || input === "true") return true;
      if (input === false || input === "false") return false;
      throw new Error(`"${def.label}" deve ser ligado ou desligado.`);
    }
    case "number": {
      const n = Number(String(input).replace(",", "."));
      if (isNaN(n) || (def.min !== undefined && n < def.min) || (def.max !== undefined && n > def.max)) {
        throw new Error(`"${def.label}" deve ser um número entre ${def.min} e ${def.max}.`);
      }
      return n;
    }
    case "list": {
      if (!Array.isArray(input)) throw new Error(`"${def.label}" deve ser uma lista.`);
      const list = Array.from(new Set(input.map((x) => String(x).trim()).filter(Boolean))).slice(0, 20);
      if (def.options && !list.every((x) => def.options!.includes(x))) throw new Error(`"${def.label}" tem um valor inválido.`);
      return list;
    }
    default: {
      const text = String(input ?? "").trim();
      if (def.maxLength && text.length > def.maxLength) throw new Error(`"${def.label}" aceita até ${def.maxLength} letras.`);
      if (def.type === "url" && text && !/^https:\/\/\S+$/i.test(text)) throw new Error(`"${def.label}" deve começar por https://`);
      return text;
    }
  }
}

export async function saveSetting(key: string, input: any, adminId: string) {
  const def = defOf(key);
  if (!def) {
    throw new Error("Configuração desconhecida.");
  }

  const value = coerce(def, input);
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as any, updatedBy: adminId },
    update: { value: value as any, updatedBy: adminId },
  });
  forgetSettings();
  return value;
}
