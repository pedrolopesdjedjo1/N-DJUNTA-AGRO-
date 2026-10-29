import { Option } from "./ngoCatalog";

// Os perfis de comprador têm nomes diferentes no servidor mas aparecem todos como "Cliente".
// Estas funções juntam-nos numa só opção.
export function creatableRoles(roles: Option[]): Option[] {
  const seen = new Set<string>();
  return roles.filter((r) => {
    if (seen.has(r.label)) return false;
    seen.add(r.label);
    return true;
  });
}

// Opções para filtrar listas de utilizadores por perfil
export function roleFilterOptions(roles: Option[]): Option[] {
  const out: Option[] = [];
  creatableRoles(roles).forEach((r) => {
    if (r.label === "Cliente") out.push({ value: "BUYER", label: "Clientes" });
    else out.push({ value: r.value, label: `${r.label}${r.label.endsWith("s") ? "" : "s"}` });
  });
  out.push({ value: "AGENTE", label: "Agentes" });
  out.push({ value: "ADMIN", label: "Administradores" });
  return out;
}
