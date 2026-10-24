export const LINK_STATUS_COLOR: Record<string, string> = {
  ATIVO: "#2E7D32",
  PENDENTE_ACEITACAO: "#F9A825",
  REVOGADO: "#757575",
  RECUSADO: "#C62828",
};

export const AGENT_STATUS_COLOR: Record<string, string> = {
  RASCUNHO: "#757575",
  PENDENTE: "#F9A825",
  APROVADO: "#2E7D32",
  RECUSADO: "#C62828",
  SUSPENSO: "#C62828",
};

export const ROLE_ICON: Record<string, string> = {
  AGRICULTOR: "🌾",
  PESCADOR: "🎣",
  ARTESAO: "🧺",
  COMERCIANTE: "🏪",
  COMPRADOR: "🛒",
  CLIENTE: "🛒",
  TRANSPORTADOR: "🚚",
};

export const ROLE_NAME: Record<string, string> = {
  AGRICULTOR: "Agricultor",
  PESCADOR: "Pescador",
  ARTESAO: "Artesão",
  COMERCIANTE: "Comerciante",
  COMPRADOR: "Cliente",
  CLIENTE: "Cliente",
  TRANSPORTADOR: "Transportador",
};

export const ACTIVITY_ICON: Record<string, string> = {
  CADASTRO: "🆕",
  CONVITE: "✉️",
  CONTACTO: "📞",
  VISITA: "🚶",
  ATENDIMENTO: "🙋",
  NOTA: "📝",
  ASSISTENCIA_INICIADA: "🤝",
  ASSISTENCIA_TERMINADA: "✅",
  ACAO_ASSISTIDA: "🛠️",
  ENCOMENDA: "📦",
  TRANSPORTE: "🚚",
  OPORTUNIDADE: "📢",
  PROBLEMA: "⚠️",
  TAREFA: "☑️",
};

type Tool = [string, string, string];

// O que o agente pode fazer na conta de cada tipo de cliente (usa as telas que já existem)
const ASSIST_TOOLS: Record<string, Tool[]> = {
  AGRICULTOR: [
    ["➕", "Publicar um produto", "AddProduct"],
    ["🛒", "Vender produtos", "FarmerSell"],
    ["🌱", "Produção", "FarmerProduction"],
    ["📦", "Pedidos recebidos", "FarmerOrders"],
    ["🚚", "Transporte", "FarmerTransport"],
    ["🌾", "Início do agricultor", "FarmerHome"],
    ["👤", "Perfil", "FarmerProfile"],
  ],
  PESCADOR: [
    ["➕", "Publicar um produto", "AddProduct"],
    ["🐟", "Vender pescado", "FisherSell"],
    ["🎣", "Registar pescas", "FisherCatches"],
    ["📦", "Pedidos recebidos", "FisherOrders"],
    ["🚚", "Transporte", "FisherTransport"],
    ["🎣", "Início do pescador", "FisherHome"],
    ["👤", "Perfil", "FisherProfile"],
  ],
  ARTESAO: [
    ["➕", "Publicar um produto", "AddProduct"],
    ["🛍️", "Vender", "ArtisanSell"],
    ["🧺", "Os meus artesanatos", "ArtisanProducts"],
    ["📦", "Pedidos recebidos", "ArtisanOrders"],
    ["🧺", "Início do artesão", "ArtisanHome"],
    ["👤", "Perfil", "ArtisanProfile"],
  ],
  COMERCIANTE: [
    ["➕", "Publicar um produto", "AddProduct"],
    ["📦", "Os meus produtos", "MerchantProducts"],
    ["🛒", "Pedidos recebidos", "MerchantOrders"],
    ["🚚", "Entregas", "MerchantDeliveries"],
    ["💰", "Vendas", "MerchantSales"],
    ["🏪", "Início do comerciante", "MerchantHome"],
    ["👤", "Perfil da loja", "StoreProfile"],
  ],
  COMPRADOR: [
    ["🔎", "Procurar produtos", "ClientExplore"],
    ["🛒", "Carrinho e compra", "ClientCart"],
    ["📦", "As encomendas", "ClientOrders"],
    ["🛒", "Início do cliente", "ClientHome"],
    ["👤", "Perfil", "ClientProfile"],
  ],
  TRANSPORTADOR: [
    ["🚚", "Transportes", "Transport"],
    ["👤", "Perfil", "Profile"],
  ],
};

export function assistToolsFor(role?: string): Tool[] {
  if (role === "CLIENTE") return ASSIST_TOOLS.COMPRADOR;
  return ASSIST_TOOLS[String(role)] ?? ASSIST_TOOLS.COMPRADOR;
}
