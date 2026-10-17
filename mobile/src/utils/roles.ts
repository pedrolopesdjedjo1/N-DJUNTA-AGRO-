export const ROLE_LABEL: Record<string, string> = {
  AGRICULTOR: "Agricultor",
  PESCADOR: "Pescador",
  ARTESAO: "Artesão",
  COMERCIANTE: "Comerciante",
  TRANSPORTADOR: "Transportador",
  COMPRADOR: "Comprador",
  CLIENTE: "Cliente",
  ONG: "Organização",
  GOVERNO: "Governo",
  ADMIN: "Equipa NÔDJUNTA AGRO",
};

// Sector de apoio de cada perfil
export const ROLE_SECTOR: Record<string, string> = {
  AGRICULTOR: "AGRICULTURA",
  PESCADOR: "PESCA",
  ARTESAO: "ARTESANATO",
};

// Idade aproximada a partir do ano de nascimento
export function ageFrom(birthYear?: number | null): number | null {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear;
  return age >= 0 && age < 120 ? age : null;
}
