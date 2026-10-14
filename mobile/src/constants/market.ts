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
  { value: "AGRICULTURA", label: "Agricultura", icon: "🌱", subcategories: ["Legumes", "Hortaliças", "Frutas", "Caju", "Cereais", "Arroz", "Feijão", "Raízes e tubérculos", "Sementes", "Fertilizantes", "Ferramentas", "Máquinas agrícolas", "Equipamentos"] },
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

export const ESTADOS_PRODUTO = [
  { value: "FRESCO", label: "Fresco" },
  { value: "MADURO", label: "Maduro" },
  { value: "VERDE", label: "Verde" },
  { value: "SECO", label: "Seco" },
  { value: "PROCESSADO", label: "Processado" },
  { value: "CONGELADO", label: "Congelado" },
];

export const TIPOS = [
  { value: "PRODUTO", label: "Produto" },
  { value: "MATERIAL", label: "Material" },
  { value: "FERRAMENTA", label: "Ferramenta" },
];

export const FARM_UNITS = ["kg", "saco", "litro", "cacho", "caixa", "unidade", "tonelada"];

export const FARM_TYPES = [
  "Agricultor familiar",
  "Pequeno produtor",
  "Horticultor",
  "Produtor de arroz",
  "Produtor de caju",
  "Fruticultor",
  "Pecuarista",
  "Outro",
];

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  NOVO: { label: "Novo", color: "#F9A825" },
  ACEITO: { label: "Aceite", color: "#1565C0" },
  EM_PREPARACAO: { label: "Em preparação", color: "#6A1B9A" },
  PRONTO: { label: "Pronto", color: "#EF6C00" },
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

export const EVENT_KINDS = [
  { value: "FEIRA", label: "Feira" },
  { value: "EVENTO_CULTURAL", label: "Evento cultural" },
  { value: "MERCADO_LOCAL", label: "Mercado local" },
  { value: "EXPOSICAO", label: "Exposição" },
  { value: "OUTRO", label: "Outro" },
];

export const LEARNING_CATEGORIES = [
  { value: "GUIA", label: "Guias agrícolas" },
  { value: "CULTIVO", label: "Técnicas de cultivo" },
  { value: "COLHEITA", label: "Técnicas de colheita" },
  { value: "CONSERVACAO", label: "Conservação" },
  { value: "PRAGAS", label: "Combate a pragas" },
  { value: "CONSELHOS", label: "Conselhos" },
  { value: "TECNICA", label: "Técnicas" },
  { value: "CURSO", label: "Cursos" },
  { value: "TUTORIAL", label: "Tutoriais" },
  { value: "VIDEO", label: "Vídeos" },
  { value: "NEGOCIOS", label: "Gestão de negócios" },
  { value: "FOTOGRAFIA", label: "Fotografia de produtos" },
  { value: "PRECOS", label: "Como definir preços" },
  { value: "VENDAS", label: "Como vender melhor" },
];

export const POST_KINDS = [
  { value: "CONHECIMENTO", label: "Partilha de conhecimentos" },
  { value: "VENDA_COLETIVA", label: "Venda coletiva" },
  { value: "COMPRA_COLETIVA", label: "Compra coletiva" },
  { value: "EVENTO", label: "Evento da comunidade" },
  { value: "AVISO", label: "Aviso" },
];

export const TICKET_KINDS = [
  { value: "EMERGENCIA", label: "Emergência agrícola" },
  { value: "PEDIDO", label: "Problema com pedido" },
  { value: "PAGAMENTO", label: "Problema com pagamento" },
  { value: "ENTREGA", label: "Problema com entrega" },
  { value: "RECLAMACAO", label: "Reclamação" },
  { value: "SUGESTAO", label: "Sugestão" },
  { value: "OUTRO", label: "Outro" },
];

export const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  ABERTO: { label: "Aberto", color: "#F9A825" },
  EM_ANALISE: { label: "Em análise", color: "#1565C0" },
  RESOLVIDO: { label: "Resolvido", color: "#2E7D32" },
};

export const CONTACT_KINDS = [
  { value: "GERAL", label: "Geral" },
  { value: "AGRICOLA", label: "Agricultura" },
  { value: "VETERINARIO", label: "Veterinário" },
  { value: "SAUDE", label: "Saúde" },
  { value: "SEGURANCA", label: "Segurança" },
  { value: "MAR", label: "Mar e pesca" },
];

export const CRAFT_TYPES = [
  "Cestaria",
  "Tecelagem",
  "Cerâmica",
  "Escultura em madeira",
  "Costura e roupa tradicional",
  "Joias e adornos",
  "Couro",
  "Pintura",
  "Outro",
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

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${hh}:${mi}`;
}
