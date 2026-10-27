import { allSettings, coerce, defOf, getSetting, saveSetting } from "../lib/platformSettings";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

// Todas as configurações, com a indicação das que este administrador pode mudar
export async function listSettings(admin: AdminSnapshot) {
  const rows = await allSettings();
  const groups = new Map<string, any[]>();

  rows.forEach(({ def, value, custom }) => {
    const item = {
      key: def.key,
      label: def.label,
      type: def.type,
      hint: def.hint ?? null,
      options: def.options ?? null,
      min: def.min ?? null,
      max: def.max ?? null,
      maxLength: def.maxLength ?? null,
      value,
      default: def.default,
      custom,
      canEdit: admin.permissions.has(def.perm),
    };
    groups.set(def.group, [...(groups.get(def.group) ?? []), item]);
  });

  return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
}

export async function updateSetting(admin: AdminSnapshot, key: string, input: any) {
  const def = defOf(key);
  if (!def) {
    throw new Error("Configuração desconhecida.");
  }
  if (!admin.permissions.has(def.perm)) {
    throw new Error("Não tem permissão para mudar esta configuração.");
  }

  coerce(def, input);
  const before = await getSetting(key);
  const value = await saveSetting(key, input, admin.userId);

  const secret = def.type === "text";
  await logAudit(admin.userId, "SETTING_UPDATE", { type: "SETTING", id: key }, `Mudou "${def.label}"`, secret ? undefined : { before, after: value });
  return { key, value };
}
