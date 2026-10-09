export interface Department {
  value: string;
  label: string;
  icon: string;
  subcategories: string[];
}

export const DEPARTMENTS: Department[] = [
  { value: "ALIMENTACAO", label: "Alimentação", icon: "🌾", subcategories: ["Legumes", "Frutas", "Cereais", "Arroz", "Feijão", "Óleo", "Bebidas", "Produtos alimentares"] },
  { value: "ROUPA_MODA", label: "Roupa e Moda", icon: "👕", subcategories: ["Camisas", "Calças", "Vestidos", "Sapatos", "Sandálias", "Bolsas", "Acessórios"] },
  { value: "CASA", label: "Casa", icon: "🏠", subcategories: ["Móveis", "Eletrodomésticos", "Colchões", "Utensílios", "Decoração", "Materiais para casa"] },
  { value: "CONSTRUCAO", label: "Construção", icon: "🧱", subcategories: ["Cimento", "Ferro", "Tijolos", "Areia", "Tinta", "Telhas", "Canalização", "Ferramentas", "Materiais elétricos"] },
  { value: "TECNOLOGIA", label: "Tecnologia", icon: "📱", subcategories: ["Telefones", "Computadores", "Televisores", "Acessórios", "Equipamentos eletrónicos"] },
  { value: "VEICULOS", label: "Veículos", icon: "🚗", subcategories: ["Carros", "Motos", "Motocicletas", "Peças", "Pneus", "Acessórios", "Máquinas e equipamentos"] },
  { value: "AGRICULTURA", label: "Agricultura", icon: "🌱", subcategories: ["Sementes", "Fertilizantes", "Ferramentas", "Máquinas agrícolas", "Equipamentos"] },
  { value: "PESCA", label: "Pesca", icon: "🎣", subcategories: ["Redes", "Anzóis", "Motores", "Barcos", "Equipamentos de pesca"] },
  { value: "ARTESANATO", label: "Artesanato", icon: "🧺", subcategories: ["Produtos artesanais", "Decoração", "Produtos tradicionais", "Roupas tradicionais"] },
  { value: "OUTROS", label: "Outros", icon: "📦", subcategories: [] },
];

export function departmentOf(value?: string | null): Department | undefined {
  return DEPARTMENTS.find((d) => d.value === value);
}

export function departmentLabel(value?: string | null): string {
  const found = departmentOf(value);
  return found ? `${found.icon} ${found.label}` : "📦 Outros";
}

export const ESTADOS = [
  { value: "NOVO", label: "Novo" },
  { value: "USADO", label: "Usado" },
];

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  NOVO: { label: "Novo", color: "#F9A825" },
  ACEITO: { label: "Aceite", color: "#1565C0" },
  EM_PREPARACAO: { label: "Em preparação", color: "#6A1B9A" },
  ENVIADO: { label: "Enviado", color: "#00838F" },
  CONCLUIDO: { label: "Concluído", color: "#2E7D32" },
  CANCELADO: { label: "Cancelado", color: "#C62828" },
};

export const DELIVERY_STATUS: Record<string, { label: string; color: string }> = {
  SOLICITADA: { label: "Solicitada", color: "#F9A825" },
  ACEITA: { label: "Aceite", color: "#1565C0" },
  RECOLHIDA: { label: "Recolhida", color: "#6A1B9A" },
  EM_TRANSITO: { label: "Em trânsito", color: "#00838F" },
  ENTREGUE: { label: "Entregue", color: "#2E7D32" },
  CANCELADA: { label: "Cancelada", color: "#C62828" },
};

export const PROMOTION_KINDS = [
  { value: "DESCONTO", label: "Desconto" },
  { value: "OFERTA_ESPECIAL", label: "Oferta especial" },
  { value: "DESTAQUE", label: "Produto em destaque" },
  { value: "CAMPANHA", label: "Campanha" },
];

export const SUPPORT = {
  phones: ["955407156", "965281785"],
  email: "nodjunta.gb@gmail.com",
};

export function money(value?: number | null): string {
  const n = Math.round(Number(value) || 0);
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
