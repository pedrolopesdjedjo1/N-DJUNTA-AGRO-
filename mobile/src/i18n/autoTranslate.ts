import { Alert, Text, TextInput } from "react-native";
import type { Lang } from "./translations";

// [Português, Kriol, Français]
// Para traduzir mais textos, basta acrescentar linhas nesta lista.
const WORDS: [string, string, string][] = [
  // Geral
  ["Início", "Inísiu", "Accueil"],
  ["Produtos", "Produtus", "Produits"],
  ["Pedidos", "Pedidus", "Commandes"],
  ["Vendas", "Bendas", "Ventes"],
  ["Perfil", "Perfil", "Profil"],
  ["Mais", "Mas", "Plus"],
  ["Menu", "Menu", "Menu"],
  ["Voltar", "Torna", "Retour"],
  ["Guardar", "Guarda", "Enregistrer"],
  ["Guardar loja", "Guarda loja", "Enregistrer la boutique"],
  ["Cancelar", "Kansela", "Annuler"],
  ["Enviar", "Manda", "Envoyer"],
  ["Apagar", "Apaga", "Supprimer"],
  ["Remover", "Tira", "Retirer"],
  ["Pausar", "Pausa", "Mettre en pause"],
  ["Ativar", "Ativa", "Activer"],
  ["Editar", "Edita", "Modifier"],
  ["Atualizar", "Atualiza", "Mettre à jour"],
  ["Sim", "Sin", "Oui"],
  ["Não", "Nau", "Non"],
  ["Sair", "Sai", "Déconnexion"],
  ["Entrar", "Entra", "Se connecter"],
  ["Erro", "Erru", "Erreur"],
  ["Pronto", "Prontu", "Terminé"],
  ["Enviado", "Mandadu", "Envoyé"],
  ["Ver tudo", "Odja tudu", "Voir tout"],
  ["Todos", "Tudu", "Tous"],
  ["Todas", "Tudu", "Toutes"],
  ["Novos", "Novus", "Nouveaux"],
  ["Aceites", "Aseitadus", "Acceptées"],
  ["Em preparação", "Na prepara", "En préparation"],
  ["Enviados", "Mandadus", "Envoyées"],
  ["Nenhum pedido aqui.", "Ka ten pedidu li.", "Aucune commande ici."],
  ["Idioma", "Lingua", "Langue"],
  ["Suporte", "Sopórti", "Assistance"],
  ["Verificação", "Verifikason", "Vérification"],
  ["Avaliações", "Avaliasons", "Avis"],
  ["Notificações", "Notifikasons", "Notifications"],
  ["Mensagens", "Mensajens", "Messages"],
  ["Ajuda e suporte", "Ajuda i sopórti", "Aide et assistance"],
  ["Configurações", "Konfigurasons", "Paramètres"],
  ["Aprender", "Prende", "Apprendre"],
  ["Feiras e eventos", "Feras i eventus", "Foires et événements"],
  ["Mercado", "Mérkadu", "Marché"],
  ["Entrega", "Entrega", "Livraison"],
  ["Meu perfil", "Meu perfil", "Mon profil"],

  // Início do cliente
  ["Bom dia", "Bon dia", "Bonjour"],
  ["Boa tarde", "Boa tardi", "Bon après-midi"],
  ["Boa noite", "Boa noti", "Bonsoir"],
  ["Olá", "Olá", "Bonjour"],
  ["O que precisa hoje?", "Kuse ki bu meste ozi?", "De quoi avez-vous besoin aujourd'hui ?"],
  ["Pesquisar produtos, vendedor…", "Buska produtus, vendedor…", "Rechercher produits, vendeur…"],
  ["A minha área", "Meu área", "Mon espace"],
  ["Abra o seu espaço de trabalho", "Abri bu spasu di trabadju", "Ouvrez votre espace de travail"],
  ["Categorias", "Kategorias", "Catégories"],
  ["Comércio", "Komérsiu", "Commerce"],
  ["Produtos em destaque", "Produtus na distake", "Produits en vedette"],
  ["Juntos, fazemos acontecer.", "Djuntu, no ta fasi ta akontesi.", "Ensemble, faisons que ça arrive."],

  // Categorias
  ["Alimentação", "Alimentason", "Alimentation"],
  ["Roupa e Moda", "Ropa i Moda", "Vêtements et mode"],
  ["Casa", "Kasa", "Maison"],
  ["Construção", "Konstrukson", "Construction"],
  ["Tecnologia", "Tecnolojia", "Technologie"],
  ["Veículos", "Veíkulus", "Véhicules"],
  ["Agricultura", "Agrikultura", "Agriculture"],
  ["Pesca", "Peska", "Pêche"],
  ["Artesanato", "Artizanatu", "Artisanat"],
  ["Outros", "Otrus", "Autres"],

  // Área do comerciante
  ["Ganhos", "Gañus", "Gains"],
  ["Produtos publicados", "Produtus publikadu", "Produits publiés"],
  ["Disponíveis", "Disponíveis", "Disponibles"],
  ["Disponível", "Disponível", "Disponible"],
  ["Indisponível", "Indisponível", "Indisponible"],
  ["Novos pedidos", "Pedidus novu", "Nouvelles commandes"],
  ["Em andamento", "Na andamentu", "En cours"],
  ["Clientes", "Klientis", "Clients"],
  ["Alertas", "Alertas", "Alertes"],
  ["Estoque baixo", "Stoki baxu", "Stock faible"],
  ["Estoque", "Stoki", "Stock"],
  ["Restam", "Ta resta", "Il reste"],
  ["Meus produtos", "Meus produtus", "Mes produits"],
  ["Publicar produto", "Publika produtu", "Publier un produit"],
  ["Cadastrar produto", "Rejista produtu", "Enregistrer un produit"],
  ["Pesquisar nos meus produtos", "Buska na meus produtus", "Rechercher dans mes produits"],

  // Vendas
  ["Vendas e ganhos", "Bendas i gañus", "Ventes et gains"],
  ["Vendas de hoje", "Bendas di ozi", "Ventes du jour"],
  ["Vendas da semana", "Bendas di simana", "Ventes de la semaine"],
  ["Vendas do mês", "Bendas di mês", "Ventes du mois"],
  ["Total recebido", "Total risibidu", "Total reçu"],
  ["Pagamentos pendentes", "Pagamentus pendenti", "Paiements en attente"],
  ["Relatório dos últimos 14 dias", "Relatóriu di últimus 14 dias", "Rapport des 14 derniers jours"],
  ["Total no período", "Total na períodu", "Total sur la période"],
  ["Histórico", "Istóriku", "Historique"],
  ["Ainda não há vendas.", "Inda ka ten bendas.", "Pas encore de ventes."],

  // Perfil da loja
  ["Perfil da loja", "Perfil di loja", "Profil de la boutique"],
  ["Perfil da loja guardado.", "Perfil di loja guardadu.", "Profil de la boutique enregistré."],
  ["Ainda não verificado", "Inda ka verifikadu", "Pas encore vérifié"],
  ["Logo", "Logu", "Logo"],
  ["Escolher logo", "Skodja logu", "Choisir le logo"],
  ["Nome da loja", "Nómi di loja", "Nom de la boutique"],
  ["Descrição", "Diskrison", "Description"],
  ["Contacto", "Kontaktu", "Contact"],
  ["Localização", "Lokalizason", "Localisation"],
  ["Horário", "Orariu", "Horaires"],
  ["Categorias da loja", "Kategorias di loja", "Catégories de la boutique"],
  ["Fotos da loja", "Fotus di loja", "Photos de la boutique"],
  ["Galeria", "Galeria", "Galerie"],
  ["Câmera", "Kámera", "Appareil photo"],
  ["Câmara", "Kámera", "Appareil photo"],

  // Área do artesão
  ["Meus artesanatos", "Meus artizanatus", "Mes créations"],
  ["Artesanatos", "Artizanatus", "Créations"],
  ["Vender", "Bende", "Vendre"],
  ["Preços e stock", "Presus i stoki", "Prix et stock"],
  ["Materiais e fornecedores", "Materiais i fornesedoris", "Matériaux et fournisseurs"],
  ["Cooperativas e comunidades", "Kooperativas i komunidadis", "Coopératives et communautés"],
  ["Pedidos recebidos", "Pedidus risibidu", "Commandes reçues"],
  ["Produtos vendidos", "Produtus bendidu", "Produits vendus"],
  ["Ganhos do dia", "Gañus di dia", "Gains du jour"],
  ["Ganhos do mês", "Gañus di mês", "Gains du mois"],
  ["Avaliação", "Avaliason", "Évaluation"],
  ["Em produção", "Na produson", "En production"],
  ["Prontos", "Prontus", "Prêts"],
  ["Alertas importantes", "Alertas importanti", "Alertes importantes"],
  ["Tudo em dia. Nenhum alerta por agora.", "Tudu na orden. Ka ten alerta pa agora.", "Tout est à jour. Aucune alerte pour le moment."],
  ["Marcar como vendido", "Marka komu bendidu", "Marquer comme vendu"],
  ["À venda", "Na venda", "En vente"],
  ["Pesquisar nos meus artesanatos", "Buska na meus artizanatus", "Rechercher dans mes créations"],
  ["Ainda não cadastrou artesanatos.", "Inda bu ka rejista artizanatus.", "Vous n'avez pas encore enregistré de créations."],

  // Verificação
  ["Verificação de identidade", "Verifikason di identidadi", "Vérification d'identité"],
  ["Envie uma foto do seu documento para receber o selo de conta verificada. Isto dá mais confiança a quem compra e vende consigo.", "Manda un foto di bu dokumentu pa risibi selu di konta verifikadu. Kel-li ta da mas konfiansa a kil ki ta kumpra i bende ku bo.", "Envoyez une photo de votre document pour recevoir le badge de compte vérifié. Cela inspire plus de confiance à ceux qui achètent et vendent avec vous."],
  ["Tipo de documento", "Tipu di dokumentu", "Type de document"],
  ["Bilhete de identidade", "Bilhete di identidadi", "Carte d'identité"],
  ["Passaporte", "Pasaporti", "Passeport"],
  ["Carta de condução", "Karta di kondusaun", "Permis de conduire"],
  ["Cartão de eleitor", "Kartau di eleitor", "Carte d'électeur"],
  ["Selfie com o documento (opcional)", "Selfi ku dokumentu (opsional)", "Selfie avec le document (facultatif)"],
  ["Nota (opcional)", "Nota (opsional)", "Note (facultatif)"],
  ["Algo que a equipa deva saber", "Algu kusa ki ekipa debe sabe", "Quelque chose que l'équipe doit savoir"],
  ["Enviar pedido", "Manda pedidu", "Envoyer la demande"],
  ["Os meus pedidos", "Meus pedidus", "Mes demandes"],
  ["O seu pedido foi enviado e vai ser analisado.", "Bu pedidu foi mandadu i ta ser analizadu.", "Votre demande a été envoyée et sera examinée."],

  // Agricultor
  ["A carregar detalhes...", "Ta karega detalhis...", "Chargement des détails..."],
  ["Acompanhar transporte", "Kompanha transporti", "Suivre le transport"],
  ["Ainda há poucos dados para mostrar a evolução.", "Inda ten pokus dadus pa mostra evolusaun.", "Pas encore assez de données pour montrer l'évolution."],
  ["Ainda não cadastrou produção disponível.", "Inda bu ka rejista produson disponível.", "Vous n'avez pas encore enregistré de production disponible."],
  ["Alertas de aumento ou queda", "Alertas di subida o kuida", "Alertes de hausse ou de baisse"],
  ["Alertas meteorológicos e agrícolas", "Alertas di tempu i agrikola", "Alertes météo et agricoles"],
  ["Avisar quando o preço médio estiver", "Avisa ora ki presu médiu sta", "Prévenir quand le prix moyen sera"],
  ["Clima e alertas", "Klima i alertas", "Météo et alertes"],
  ["Comparar preços", "Kompara presus", "Comparer les prix"],
  ["Compras e vendas coletivas", "Kompras i bendas kolektivu", "Achats et ventes collectifs"],
  ["Confirmar venda", "Konfirma venda", "Confirmer la vente"],
  ["Contactar cooperativa", "Kontakta kooperativa", "Contacter la coopérative"],
  ["Contactar suporte", "Kontakta sopórti", "Contacter l'assistance"],
  ["Contactos importantes", "Kontaktus importanti", "Contacts importants"],
  ["Cooperativas", "Kooperativas", "Coopératives"],
  ["Disponível agora", "Disponível agora", "Disponible maintenant"],
  ["Emergência agrícola", "Emerjénsia agrikola", "Urgence agricole"],
  ["Entre na cooperativa para ver as notícias e participar nas compras e vendas coletivas.", "Entra na kooperativa pa odja notísias i partisipa na kompras i bendas kolektivu.", "Rejoignez la coopérative pour voir les nouvelles et participer aux achats et ventes collectifs."],
  ["Equipa", "Ekipa", "Équipe"],
  ["Escolher transporte", "Skodja transporti", "Choisir le transport"],
  ["Evolução (12 semanas)", "Evolusaun (12 simanas)", "Évolution (12 semaines)"],
  ["Histórico de transportes", "Istóriku di transportis", "Historique des transports"],
  ["Histórico de vendas", "Istóriku di bendas", "Historique des ventes"],
  ["Melhor período para colheita", "Melhor tempu pa kolheita", "Meilleure période pour la récolte"],
  ["Melhor período para plantação", "Melhor tempu pa planta", "Meilleure période pour la plantation"],
  ["Minha produção", "Meu produson", "Ma production"],
  ["Nenhum alerta para os próximos dias.", "Ka ten alerta pa próximus dias.", "Aucune alerte pour les prochains jours."],
  ["Nenhum dia ideal para colher nos próximos 7 dias.", "Ka ten dia ideal pa kolhe na próximus 7 dias.", "Aucun jour idéal pour récolter dans les 7 prochains jours."],
  ["Nenhum dia ideal para plantar nos próximos 7 dias.", "Ka ten dia ideal pa planta na próximus 7 dias.", "Aucun jour idéal pour planter dans les 7 prochains jours."],
  ["Notícias da cooperativa", "Notísias di kooperativa", "Nouvelles de la coopérative"],
  ["Os meus pedidos de ajuda", "Meus pedidus di ajuda", "Mes demandes d'aide"],
  ["O transportador ainda não partilhou a localização.", "Transportador inda ka partilha lokalizason.", "Le transporteur n'a pas encore partagé sa position."],
  ["Pedidos à espera de transporte", "Pedidus ta speradu transporti", "Commandes en attente de transport"],
  ["Pedidos novos", "Pedidus novu", "Nouvelles commandes"],
  ["Praga, doença das plantas, inundação, incêndio ou outro problema urgente na sua machamba.", "Praga, duensa di planta, inundason, insendiu o otru problema urjenti na bu bunka.", "Parasites, maladie des plantes, inondation, incendie ou autre problème urgent dans votre champ."],
  ["Preço e quantidade", "Presu i kuantidadi", "Prix et quantité"],
  ["Preços de mercado", "Presus di mérkadu", "Prix du marché"],
  ["Preços dos produtos", "Presus di produtus", "Prix des produits"],
  ["Preços por região", "Presus pur rejiaun", "Prix par région"],
  ["Previsão dos próximos 7 dias", "Previzaun di próximus 7 dias", "Prévisions des 7 prochains jours"],
  ["Problemas com pedido, transporte ou pagamento", "Problemas ku pedidu, transporti o pagamentu", "Problèmes de commande, de transport ou de paiement"],
  ["Produtos da cooperativa", "Produtus di kooperativa", "Produits de la coopérative"],
  ["Produtos mais procurados (30 dias)", "Produtus mas buskadu (30 dias)", "Produits les plus recherchés (30 jours)"],
  ["Recursos agrícolas", "Rikursus agrikola", "Ressources agricoles"],
  ["Responda depressa para não perder a venda.", "Rispondi dipresa pa ka perde venda.", "Répondez vite pour ne pas perdre la vente."],
  ["Resumo da produção", "Rezumu di produson", "Résumé de la production"],
  ["Sem dados por região.", "Ka ten dadus pur rejiaun.", "Pas de données par région."],
  ["Sobre qual pedido? (opcional)", "Sobri kal pedidu? (opsional)", "À propos de quelle commande ? (facultatif)"],
  ["Ajuda e emergência", "Ajuda i emerjénsia", "Aide et urgence"],
  ["Subidas e quedas de preços", "Subidas i kuidas di presus", "Hausses et baisses de prix"],
  ["Tipo de agricultor", "Tipu di agrikultor", "Type d'agriculteur"],
  ["Transporte", "Transporti", "Transport"],
  ["Vender produtos", "Bende produtus", "Vendre des produits"],

  // Pescador
  ["A equipa está a tratar do seu pedido. Mantenha o telefone ligado.", "Ekipa sta trata di bu pedidu. Mantem telefoni li ligadu.", "L'équipe s'occupe de votre demande. Gardez le téléphone allumé."],
  ["A equipa foi avisada. Fique calmo e mantenha o telefone ligado.", "Ekipa foi avizadu. Fika kalmu i mantem telefoni ligadu.", "L'équipe a été prévenue. Restez calme et gardez le téléphone allumé."],
  ["Ainda não há contactos de resgate registados no app. Ligue para o suporte NÔDJUNTA AGRO.", "Inda ka ten kontaktus di rishgati rejistadu na app. Liga pa sopórti NÔDJUNTA AGRO.", "Aucun contact de secours enregistré dans l'app. Appelez l'assistance NÔDJUNTA AGRO."],
  ["Ainda não registou nenhuma pesca.", "Inda bu ka rejista nhuma peska.", "Vous n'avez encore enregistré aucune pêche."],
  ["Alertas de mau tempo", "Alertas di mau tempu", "Alertes de mauvais temps"],
  ["Condições do mar agora", "Kondisons di mar agora", "Conditions de la mer maintenant"],
  ["Condições para sair para o mar", "Kondisons pa sai pa mar", "Conditions pour prendre la mer"],
  ["Conservação do pescado", "Konservason di piskadu", "Conservation du poisson"],
  ["Contactar emergência e resgate", "Kontakta emerjénsia i rishgati", "Contacter urgence et secours"],
  ["Contactar suporte NÔDJUNTA AGRO", "Kontakta sopórti NÔDJUNTA AGRO", "Contacter l'assistance NÔDJUNTA AGRO"],
  ["Cooperativas de pesca", "Kooperativas di peska", "Coopératives de pêche"],
  ["Enviar a localização automaticamente a cada minuto (enquanto esta tela estiver aberta)", "Manda lokalizason otomatikamenti kada minutu (enkuantu es tela sta abertu)", "Envoyer la position automatiquement chaque minute (tant que cet écran est ouvert)"],
  ["Equipamentos", "Ekipamentus", "Équipements"],
  ["Estado e frescura do pescado", "Estadu i frexkura di piskadu", "État et fraîcheur du poisson"],
  ["Fotos da captura (até 5)", "Fotus di kaptura (te 5)", "Photos de la prise (jusqu'à 5)"],
  ["Guias detalhados", "Gias detalhadu", "Guides détaillés"],
  ["Histórico de pesca", "Istóriku di peska", "Historique de pêche"],
  ["Mais procurados (30 dias)", "Mas buskadu (30 dias)", "Les plus recherchés (30 jours)"],
  ["Mais vendidos", "Mas bendidu", "Les plus vendus"],
  ["Maré", "Maré", "Marée"],
  ["Mar e pesca", "Mar i peska", "Mer et pêche"],
  ["Minha pesca", "Meu peska", "Ma pêche"],
  ["Não foi possível carregar as zonas agora.", "Ka foi posível karega zonas agora.", "Impossible de charger les zones pour le moment."],
  ["Nenhum alerta para os próximos 3 dias.", "Ka ten alerta pa próximus 3 dias.", "Aucune alerte pour les 3 prochains jours."],
  ["O meu pescado à venda", "Meu piskadu na venda", "Mon poisson en vente"],
  ["Os pontos são referências ao largo da costa, não são locais de pesca garantidos.", "Pontus é referénsias na kosta, ka é lokais di peska garantidu.", "Les points sont des repères au large de la côte, pas des lieux de pêche garantis."],
  ["Peixe fresco não espera: responda depressa.", "Pexi fresku ka ta spera: rispondi dipresa.", "Le poisson frais n'attend pas : répondez vite."],
  ["Preços do pescado", "Presus di piskadu", "Prix du poisson"],
  ["Preços por espécie", "Presus pur spésia", "Prix par espèce"],
  ["Prevenir", "Prevene", "Prévenir"],
  ["Previsão marítima (7 dias)", "Previzaun maritima (7 dias)", "Prévisions maritimes (7 jours)"],
  ["Qual é o problema?", "Kal ki é problema?", "Quel est le problème ?"],
  ["Regras de ouro", "Regras di oru", "Règles d'or"],
  ["Resumo da atividade", "Rezumu di atividadi", "Résumé de l'activité"],
  ["Sem dados agora.", "Ka ten dadus agora.", "Pas de données pour le moment."],
  ["Sem dados de maré para esta zona. Confirme com os pescadores locais.", "Ka ten dadus di maré pa es zona. Konfirma ku piskadoris lokal.", "Pas de données de marée pour cette zone. Confirmez avec les pêcheurs locaux."],
  ["Emergência no mar", "Emerjénsia na mar", "Urgence en mer"],
  ["Tempo de conservação (orientação)", "Tempu di konservason (orientason)", "Durée de conservation (indicative)"],
  ["Tipo de barco", "Tipu di barku", "Type de bateau"],
  ["Tipo de pescador", "Tipu di piskador", "Type de pêcheur"],
  ["Unidade", "Unidadi", "Unité"],
  ["Vender pescado", "Bende piskadu", "Vendre du poisson"],
  ["Zonas de pesca", "Zonas di peska", "Zones de pêche"],
];

type Entry = { crl: string; fr: string };
const MAP: Record<string, Entry> = {};
WORDS.forEach(([pt, crl, fr]) => {
  MAP[pt.trim().toLowerCase()] = { crl, fr };
});

let current: Lang = "pt";

export function setCurrentLang(lang: Lang) {
  current = lang;
}

function lookup(s: string): string | null {
  const e = MAP[s.trim().toLowerCase()];
  if (!e) return null;
  return current === "crl" ? e.crl : current === "fr" ? e.fr : null;
}

const KEEP = /[A-Za-zÀ-ÿ0-9]/;

export function tr(s: any): any {
  if (typeof s !== "string" || current === "pt" || s.trim() === "") return s;

  // 1. Texto completo
  const full = lookup(s);
  if (full) return full;

  // 2. Sem símbolos/emojis no início e sem pontuação no fim
  let a = 0;
  while (a < s.length && !KEEP.test(s[a])) a++;
  let b = s.length;
  while (b > a && /[\s:.!?…,]/.test(s[b - 1])) b--;
  const core = s.slice(a, b);
  if (core) {
    const t = lookup(core);
    if (t) return s.slice(0, a) + t + s.slice(b);
  }

  // 3. "Rótulo: valor" e "Olá, Nome"
  for (const sep of [": ", ", "]) {
    const i = s.indexOf(sep);
    if (i > 0) {
      const left = s.slice(0, i);
      const right = s.slice(i + sep.length);
      const tl = lookup(left);
      if (tl) {
        const trr = lookup(right);
        return tl + sep + (trr ?? right);
      }
    }
  }
  return s;
}

function mapChildren(ch: any): any {
  if (typeof ch === "string") return tr(ch);
  if (Array.isArray(ch)) return ch.map(mapChildren);
  return ch;
}

function patchRender(Comp: any, fn: (props: any) => any) {
  try {
    if (!Comp || typeof Comp.render !== "function" || Comp.__nodjuntaPatched) return;
    const orig = Comp.render;
    Comp.render = function (props: any, ref: any) {
      let next = props;
      try {
        if (current !== "pt") next = fn(props);
      } catch (e) {
        next = props;
      }
      return orig.call(this, next, ref);
    };
    Comp.__nodjuntaPatched = true;
  } catch (e) {
    // se o componente não puder ser alterado, a app continua normal
  }
}

let installed = false;

export function installAutoTranslate() {
  if (installed) return;
  installed = true;

  patchRender(Text, (p) => (p && p.children !== undefined ? { ...p, children: mapChildren(p.children) } : p));

  patchRender(TextInput, (p) =>
    p && typeof p.placeholder === "string" ? { ...p, placeholder: tr(p.placeholder) } : p
  );

  try {
    const origAlert = Alert.alert;
    (Alert as any).alert = (title: any, message?: any, buttons?: any[], options?: any) =>
      origAlert.call(
        Alert,
        tr(title),
        tr(message),
        Array.isArray(buttons)
          ? buttons.map((b) => (b && typeof b.text === "string" ? { ...b, text: tr(b.text) } : b))
          : buttons,
        options
      );
  } catch (e) {
    // ignora
  }
}

installAutoTranslate();
