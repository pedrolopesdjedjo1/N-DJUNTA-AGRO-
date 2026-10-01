export type Lang = "pt" | "fr" | "crl";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "pt", label: "Português" },
  { code: "crl", label: "Kriol" },
  { code: "fr", label: "Français" },
];

type Dict = Record<string, string>;

export const translations: Record<Lang, Dict> = {
  pt: {
    welcome: "Bem-vindo",
    products: "Ver Produtos",
    profile: "Meu Perfil",
    messages: "Mensagens",
    notifications: "Notificações",
    marketPrices: "Preços de Mercado",
    weather: "Clima e Alertas",
    transport: "Transporte",
    cooperatives: "Cooperativas",
    admin: "Painel do Admin",
    language: "Idioma",
    chooseLanguage: "Escolha o idioma",
    logout: "Sair",
  },
  crl: {
    welcome: "Bon bindu",
    products: "Odja Produtus",
    profile: "Meu Perfil",
    messages: "Mensajens",
    notifications: "Notifikasons",
    marketPrices: "Presu di Mérkadu",
    weather: "Tempu i Alertas",
    transport: "Transporti",
    cooperatives: "Kooperativas",
    admin: "Painel di Admin",
    language: "Lingua",
    chooseLanguage: "Skodja lingua",
    logout: "Sai",
  },
  fr: {
    welcome: "Bienvenue",
    products: "Voir les produits",
    profile: "Mon profil",
    messages: "Messages",
    notifications: "Notifications",
    marketPrices: "Prix du marché",
    weather: "Météo et alertes",
    transport: "Transport",
    cooperatives: "Coopératives",
    admin: "Panneau admin",
    language: "Langue",
    chooseLanguage: "Choisissez la langue",
    logout: "Déconnexion",
  },
};
