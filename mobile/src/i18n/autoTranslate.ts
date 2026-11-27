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
  ["Pesquisar", "Buska", "Rechercher"],

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

  // Cliente: ecrã inicial
  ["Definir a minha localização", "Defini meu lokalizason", "Définir ma position"],
  ["Pesquisar produtos (ex: arroz, peixe, cesto)", "Buska produtus (ex: aros, pexi, kanastu)", "Rechercher des produits (ex : riz, poisson, panier)"],
  ["Ainda não há produtos disponíveis. Volte daqui a pouco.", "Inda ka ten produtus disponível. Torna dipus di un pokinhu.", "Pas encore de produits disponibles. Revenez dans un instant."],
  ["Promoções", "Promosons", "Promotions"],
  ["Produtos próximos", "Produtus pertu", "Produits à proximité"],
  ["Defina a sua localização para ver produtos perto de si.", "Defini bu lokalizason pa odja produtus pertu di bo.", "Définissez votre position pour voir les produits près de vous."],
  ["Definir localização", "Defini lokalizason", "Définir la position"],
  ["Novos produtos", "Produtus novu", "Nouveaux produits"],
  ["Recomendado para si", "Rekomendadu pa bo", "Recommandé pour vous"],
  ["Sugestões", "Sujestons", "Suggestions"],

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

  // Transportador: início
  ["Transportador novo", "Transportador novu", "Nouveau transporteur"],
  ["Veículo por registar", "Veíkulu inda ka rejistadu", "Véhicule à enregistrer"],
  ["Urgente", "Urjenti", "Urgent"],
  ["Atenção", "Atensaun", "Attention"],
  ["Info", "Info", "Info"],
  ["O seu veículo não está pronto para aceitar entregas", "Bu veíkulu ka sta pronto pa aseita entregas", "Votre véhicule n'est pas prêt à accepter des livraisons"],
  ["Registe o seu veículo.", "Rejista bu veíkulu.", "Enregistrez votre véhicule."],
  ["Complete o perfil de transportador", "Kompleta perfil di transportador", "Complétez votre profil de transporteur"],
  ["Indique o veículo e as regiões onde trabalha para ver as entregas certas.", "Indika veíkulu i rejions undi bu ta trabadja pa odja entregas sertu.", "Indiquez le véhicule et les régions où vous travaillez pour voir les bonnes livraisons."],
  ["Conta ainda não verificada", "Konta inda ka verifikadu", "Compte pas encore vérifié"],
  ["A verificação dá mais confiança a quem encomenda.", "Verifikason ta da mas konfiansa a kil ki ta enkomenda.", "La vérification inspire plus de confiance à ceux qui commandent."],
  ["Resumo das atividades", "Rezumu di atividadis", "Résumé des activités"],
  ["Cargas para si", "Kargas pa bo", "Chargements pour vous"],
  ["Por recolher", "Pa rekolhe", "À récupérer"],
  ["Em transporte", "Na transporti", "En transport"],
  ["Entregues hoje", "Entregadu ozi", "Livrées aujourd'hui"],
  ["Entregas", "Entregas", "Livraisons"],
  ["Mapa", "Mapa", "Carte"],
  ["Mapa e rotas", "Mapa i rotas", "Carte et itinéraires"],
  ["Mercados", "Mérkadus", "Marchés"],
  ["Pagamentos", "Pagamentus", "Paiements"],
  ["Palavra-passe", "Palavra-pasi", "Mot de passe"],
  ["Estado", "Estadu", "État"],
  ["Estado da conta", "Estadu di konta", "État du compte"],

  // Transportador: cargas e entregas
  ["Ofertas de transporte", "Ofertas di transporti", "Offres de transport"],
  ["Cargas e ofertas de transporte", "Kargas i ofertas di transporti", "Chargements et offres de transport"],
  ["Cargas disponíveis para si", "Kargas disponível pa bo", "Chargements disponibles pour vous"],
  ["Cargas por perto que servem ao seu veículo", "Kargas pertu ki sirbi pa bu veíkulu", "Chargements proches adaptés à votre véhicule"],
  ["Cargas que saem do mesmo sítio ou vão para o mesmo destino, que servem ao seu veículo e cabem no que lhe resta de capacidade.", "Kargas ki sai di mesmu lugar o ba pa mesmu destinu, ki sirbi pa bu veíkulu i kabe na kapasidadi ki sobra.", "Chargements qui partent du même endroit ou vont à la même destination, adaptés à votre véhicule et qui tiennent dans la capacité restante."],
  ["Cargas agrícolas, de pesca, artesanato, mercadorias, construção, vestuário e equipamentos, veículos e peças. Só as que servem ao seu veículo.", "Kargas agrikola, di peska, artizanatu, merkadoria, konstrukson, ropa i ekipamentus, veíkulus i pesas. So kil ki sirbi pa bu veíkulu.", "Chargements agricoles, de pêche, d'artisanat, de marchandises, de construction, de vêtements et équipements, de véhicules et pièces. Seulement ceux qui conviennent à votre véhicule."],
  ["Avisos de cargas novas", "Avizus di kargas novu", "Alertes de nouveaux chargements"],
  ["Combinar entregas", "Kombina entregas", "Combiner les livraisons"],
  ["Minhas entregas em curso", "Meus entregas na kursu", "Mes livraisons en cours"],
  ["Não pode aceitar esta entrega", "Bu ka pode aseita es entrega", "Vous ne pouvez pas accepter cette livraison"],
  ["Não tem entregas por recolher.", "Bu ka ten entregas pa rekolhe.", "Vous n'avez pas de livraisons à récupérer."],
  ["Não tem entregas por avaliar. Depois de entregar, avalie o comprador e o vendedor: ajuda toda a comunidade.", "Bu ka ten entregas pa avalia. Dipus di entrega, avalia kumpradur i vendedor: ta ajuda tudu komunidadi.", "Aucune livraison à évaluer. Après la livraison, évaluez l'acheteur et le vendeur : cela aide toute la communauté."],
  ["Concluídas recentemente", "Konkluídu resentementi", "Terminées récemment"],
  ["Entregue alguma carga antes de recolher a seguinte, ou fale com o vendedor para trocar a ordem.", "Entrega alguma karga antis di rekolhe kel seguinti, o papia ku vendedor pa troka orden.", "Livrez un chargement avant de récupérer le suivant, ou parlez au vendeur pour changer l'ordre."],
  ["A melhor ordem para as suas entregas em curso: as recolhas antes das entregas, sempre a paragem mais perto.", "Melhor orden pa bu entregas na kursu: rekolhas antis di entregas, sempri paradja mas pertu.", "Le meilleur ordre pour vos livraisons en cours : les collectes avant les livraisons, toujours l'arrêt le plus proche."],
  ["Estas paragens não têm local nem região reconhecidos. Combine com o vendedor ou o comprador.", "Es paradjas ka ten lokal nem rejiaun konhesidu. Kombina ku vendedor o kumpradur.", "Ces arrêts n'ont pas de lieu ni de région reconnus. Convenez-en avec le vendeur ou l'acheteur."],
  ["As distâncias abaixo contam a partir de si.", "Distánsias di baxu ta kontadu di bo.", "Les distances ci-dessous sont comptées à partir de vous."],
  ["Distância e tempo são estimativas entre regiões.", "Distánsia i tempu é estimativas entri rejions.", "La distance et le temps sont des estimations entre régions."],
  ["Diga que viagem vai fazer e quanto espaço tem livre.", "Fala ki viaji bu ta fasi i kuantu spasu bu ten livri.", "Dites quel trajet vous allez faire et combien d'espace vous avez de libre."],
  ["A localização exata foi marcada.", "Lokalizason ezatu foi markadu.", "La position exacte a été marquée."],
  ["Os produtos estão prontos para recolher.", "Produtus sta pronto pa rekolhe.", "Les produits sont prêts à être récupérés."],
  ["Confira os produtos com o vendedor. Uma foto da carga protege-o se houver reclamações.", "Konfera produtus ku vendedor. Un foto di karga ta protehe-u si ten reklamasons.", "Vérifiez les produits avec le vendeur. Une photo du chargement vous protège en cas de réclamation."],
  ["Já recolheu os produtos. Explique o que se passou e onde estão: a equipa vai acompanhar.", "Bu ja rekolhe produtus. Splika kuse ki pasa i undi ki sta: ekipa ta kompanha.", "Vous avez récupéré les produits. Expliquez ce qui s'est passé et où ils sont : l'équipe va suivre."],
  ["Já recebeu? Confirme. Não chegou? Reclame. Toque para ver.", "Bu ja risibi? Konfirma. Ka txiga? Reklama. Toka pa odja.", "Reçu ? Confirmez. Pas arrivé ? Réclamez. Touchez pour voir."],
  ["Como recebeu?", "Modi ki bu risibi?", "Comment avez-vous reçu ?"],
  ["A entrega volta a ficar disponível para outros transportadores. Cancelar muitas entregas baixa a sua reputação.", "Entrega ta torna fika disponível pa otrus transportadoris. Kansela txeu entregas ta baxa bu reputason.", "La livraison redevient disponible pour d'autres transporteurs. Annuler beaucoup de livraisons baisse votre réputation."],
  ["Depois de aceitar a entrega, vê os contactos.", "Dipus di aseita entrega, bu ta odja kontaktus.", "Après avoir accepté la livraison, vous voyez les contacts."],
  ["Os compradores e vendedores das suas entregas, com o histórico de chamadas e mensagens.", "Kumpradoris i vendedoris di bu entregas, ku istóriku di txamadas i mensajens.", "Les acheteurs et vendeurs de vos livraisons, avec l'historique des appels et messages."],
  ["Clientes e contactos", "Klientis i kontaktus", "Clients et contacts"],
  ["Histórico de contactos", "Istóriku di kontaktus", "Historique des contacts"],
  ["Ainda não ligou nem escreveu a esta pessoa por aqui.", "Bu inda ka liga nem skrebe pa es pesoa li.", "Vous n'avez pas encore appelé ni écrit à cette personne ici."],
  ["Ligar para pedir ajuda", "Liga pa pidi ajuda", "Appeler pour demander de l'aide"],

  // Transportador: localização e partilha
  ["Localização desligada", "Lokalizason diskonetadu", "Localisation désactivée"],
  ["Localização do telemóvel", "Lokalizason di telemóvel", "Localisation du téléphone"],
  ["Partilhar a localização nas entregas", "Partilha lokalizason na entregas", "Partager la position pendant les livraisons"],
  ["Partilhar a minha localização", "Partilha meu lokalizason", "Partager ma position"],
  ["Partilhar nas entregas", "Partilha na entregas", "Partager pendant les livraisons"],
  ["Ainda não partilhou onde está.", "Bu inda ka partilha undi ki bu sta.", "Vous n'avez pas encore partagé où vous êtes."],
  ["A partilha de localização está desligada nas suas configurações.", "Partilha di lokalizason sta diskonetadu na bu konfigurasons.", "Le partage de position est désactivé dans vos paramètres."],
  ["Ative a localização para ver as cargas por ordem de distância até si.", "Ativa lokalizason pa odja kargas pur orden di distánsia te bo.", "Activez la localisation pour voir les chargements par ordre de distance."],
  ["Ative-a para ver a distância até cada carga, mercado e posto, e para a rota sugerida partir de onde está.", "Ativa-l pa odja distánsia te kada karga, mérkadu i postu, i pa rota sujeridu parti di undi bu sta.", "Activez-la pour voir la distance jusqu'à chaque chargement, marché et poste, et pour que l'itinéraire suggéré parte d'où vous êtes."],
  ["Com o app aberto, a localização é enviada a cada minuto ao comprador e ao vendedor.", "Ku app abertu, lokalizason ta manda kada minutu pa kumpradur i vendedor.", "Avec l'app ouverte, la position est envoyée chaque minute à l'acheteur et au vendeur."],
  ["Ao iniciar, o comprador é avisado com a hora estimada de chegada e a entrega fica acompanhada. Ative a localização do telemóvel.", "Na kumesu, kumpradur ta ser avizadu ku ora estimadu di txigada i entrega ta fika kompanhadu. Ativa lokalizason di telemóvel.", "Au démarrage, l'acheteur est prévenu de l'heure d'arrivée estimée et la livraison est suivie. Activez la localisation du téléphone."],
  ["O comprador é avisado de que chegou ao destino.", "Kumpradur ta ser avizadu ki bu txiga na destinu.", "L'acheteur est prévenu que vous êtes arrivé à destination."],
  ["O comprador e o vendedor são avisados.", "Kumpradur i vendedor ta ser avizadu.", "L'acheteur et le vendeur sont prévenus."],

  // Transportador: veículo
  ["Meu veículo", "Meu veíkulu", "Mon véhicule"],
  ["Capacidade do veículo", "Kapasidadi di veíkulu", "Capacité du véhicule"],
  ["Disponibilidade do veículo", "Disponibilidadi di veíkulu", "Disponibilité du véhicule"],
  ["Despesas do veículo", "Dispezas di veíkulu", "Dépenses du véhicule"],
  ["Despesas", "Dispezas", "Dépenses"],
  ["Marcar o veículo como avariado", "Marka veíkulu komu avariadu", "Marquer le véhicule comme en panne"],
  ["O veículo ainda não está pronto para aceitar entregas.", "Veíkulu inda ka sta pronto pa aseita entregas.", "Le véhicule n'est pas encore prêt à accepter des livraisons."],
  ["O veículo está pronto para aceitar entregas.", "Veíkulu sta pronto pa aseita entregas.", "Le véhicule est prêt à accepter des livraisons."],
  ["Indique a capacidade de carga do veículo para ver o que ainda cabe.", "Indika kapasidadi di karga di veíkulu pa odja kuse ki inda kabe.", "Indiquez la capacité de charge du véhicule pour voir ce qui peut encore tenir."],
  ["Ainda não há fotos do veículo. As fotos dão confiança a quem encomenda e são precisas para a verificação.", "Inda ka ten fotus di veíkulu. Fotus ta da konfiansa a kil ki ta enkomenda i é presizu pa verifikason.", "Pas encore de photos du véhicule. Les photos inspirent confiance et sont nécessaires à la vérification."],
  ["Ainda não enviou o livrete, o seguro ou a inspeção do veículo.", "Bu inda ka manda livreti, seguru o inspeson di veíkulu.", "Vous n'avez pas encore envoyé la carte grise, l'assurance ou le contrôle du véhicule."],
  ["Está marcado como indisponível.", "Sta markadu komu indisponível.", "Marqué comme indisponible."],
  ["Fica indisponível e deixa de receber cargas até o pôr operacional.", "Ta fika indisponível i ka ta risibi kargas te bu pui operasional.", "Devient indisponible et ne reçoit plus de chargements jusqu'à sa remise en service."],
  ["Ao marcar o veículo como em manutenção ou avariado, fica indisponível e deixa de receber avisos de cargas.", "Ora bu marka veíkulu na manutenson o avariadu, ta fika indisponível i ka ta risibi avizus di kargas.", "En marquant le véhicule en maintenance ou en panne, il devient indisponible et ne reçoit plus d'alertes de chargements."],
  ["Depois de pôr o veículo operacional, ligue a disponibilidade no perfil para voltar a receber entregas.", "Dipus di pui veíkulu operasional, liga disponibilidadi na perfil pa torna risibi entregas.", "Après avoir remis le véhicule en service, activez la disponibilité dans le profil pour recevoir à nouveau des livraisons."],
  ["Ligue a disponibilidade no perfil para aceitar entregas.", "Liga disponibilidadi na perfil pa aseita entregas.", "Activez la disponibilité dans le profil pour accepter des livraisons."],

  // Transportador: documentos e verificação
  ["Documentos e identidade", "Dokumentus i identidadi", "Documents et identité"],
  ["Apague os documentos fora do prazo e envie documentos válidos.", "Apaga dokumentus fora di prazu i manda dokumentus válidu.", "Supprimez les documents périmés et envoyez des documents valides."],
  ["Fora do prazo. Renove-o.", "Fora di prazu. Renova-l.", "Périmé. Renouvelez-le."],
  ["Envie fotos legíveis. Só você e a equipa os veem. Os documentos fora do prazo travam o envio.", "Manda fotus legível. So bo i ekipa ta odja-s. Dokumentus fora di prazu ta trava envio.", "Envoyez des photos lisibles. Seuls vous et l'équipe les voyez. Les documents périmés bloquent l'envoi."],
  ["A enviar o documento...", "Ta manda dokumentu...", "Envoi du document..."],
  ["A equipa está a analisar. Recebe uma resposta por notificação.", "Ekipa sta analiza. Bu ta risibi rispósta pur notifikason.", "L'équipe analyse. Vous recevrez une réponse par notification."],
  ["Os documentos foram enviados e estão a ser analisados. Receberá um aviso com a resposta.", "Dokumentus foi mandadu i sta ta ser analizadu. Bu ta risibi un avizu ku rispósta.", "Les documents ont été envoyés et sont en cours d'analyse. Vous recevrez un avis avec la réponse."],
  ["A verificação foi recusada.", "Verifikason foi rekuzadu.", "La vérification a été refusée."],
  ["Corrija o que for preciso e envie de novo.", "Koriji kuse ki presiza i manda di novu.", "Corrigez ce qui est nécessaire et renvoyez."],
  ["A sua conta está verificada ✅. Quem encomenda vê o selo no seu perfil e confia mais.", "Bu konta sta verifikadu ✅. Kil ki ta enkomenda ta odja selu na bu perfil i ta konfia mas.", "Votre compte est vérifié ✅. Ceux qui commandent voient le badge sur votre profil et ont plus confiance."],
  ["A sua conta está verificada. Só mudar a matrícula obriga a nova verificação.", "Bu konta sta verifikadu. So mudansa di matrikula ta obriga nova verifikason.", "Votre compte est vérifié. Seul un changement de plaque impose une nouvelle vérification."],
  ["Aparelhos que usam a conta", "Aparelhus ki ta uza konta", "Appareils utilisant le compte"],
  ["Ainda não há aparelhos registados.", "Inda ka ten aparelhus rejistadu.", "Aucun appareil enregistré pour le moment."],

  // Transportador: ganhos e despesas
  ["Ganho líquido", "Ganhu líkidu", "Gain net"],
  ["Ganho líquido menos despesas.", "Ganhu líkidu menus dispezas.", "Gain net moins les dépenses."],
  ["Onde gastou", "Undi ki bu gasta", "Où vous avez dépensé"],
  ["Este mês", "Es mês", "Ce mois-ci"],
  ["Como se distribuem", "Modi ki ta distribui", "Comment elles se répartissent"],
  ["Escolha o período. O relatório fica em texto, pronto para enviar por mensagem ou guardar. Por defeito, os últimos 30 dias.", "Skodja períodu. Relatóriu ta fika na testu, pronto pa manda pur mensaji o guarda. Pur padraun, últimus 30 dias.", "Choisissez la période. Le rapport est en texte, prêt à envoyer par message ou à enregistrer. Par défaut, les 30 derniers jours."],
  ["O valor do transporte de cada entrega concluída. O app não movimenta dinheiro: confirme aqui quando o receber.", "Valor di transporti di kada entrega konkluídu. App ka ta movimenta dinheru: konfirma li ora bu risibi.", "Le montant du transport de chaque livraison terminée. L'app ne manipule pas d'argent : confirmez ici quand vous le recevez."],
  ["O valor do transporte de cada entrega concluída. Quem paga é combinado com o comprador ou o vendedor: quando receber, confirme aqui.", "Valor di transporti di kada entrega konkluídu. Kin ki ta paga é kombinadu ku kumpradur o vendedor: ora bu risibi, konfirma li.", "Le montant du transport de chaque livraison terminée. Qui paie est convenu avec l'acheteur ou le vendeur : à la réception, confirmez ici."],
  ["Os valores são os registados no app, que não movimenta dinheiro.", "Valoris é kil ki rejistadu na app, ki ka ta movimenta dinheru.", "Les montants sont ceux enregistrés dans l'app, qui ne manipule pas d'argent."],
  ["Explique quem devia pagar, o que combinou e o que aconteceu. A equipa analisa e responde-lhe.", "Splika kin ki divia paga, kuse ki bu kombina i kuse ki akontesi. Ekipa ta analiza i ta rispondi-u.", "Expliquez qui devait payer, ce dont vous avez convenu et ce qui s'est passé. L'équipe analyse et vous répond."],

  // Transportador: avaliações
  ["Avaliações e reputação", "Avaliasons i reputason", "Avis et réputation"],
  ["Avaliar esta entrega", "Avalia es entrega", "Évaluer cette livraison"],
  ["Comentários recebidos", "Komentárius risibidu", "Commentaires reçus"],
  ["Ainda sem avaliações", "Inda sin avaliasons", "Pas encore d'avis"],
  ["Ainda não tem avaliações. Cada entrega bem feita ajuda a construir a sua reputação.", "Bu inda ka ten avaliasons. Kada entrega ben fetu ta ajuda kria bu reputason.", "Pas encore d'avis. Chaque livraison bien faite aide à construire votre réputation."],
  ["Nenhuma reclamação. Bom trabalho!", "Nhuma reklamason. Bon trabadju!", "Aucune réclamation. Bon travail !"],

  // Transportador: segurança e emergência
  ["Dicas", "Dicas", "Conseils"],
  ["Dicas de segurança", "Dicas di seguransa", "Conseils de sécurité"],
  ["Para viajar em segurança e proteger a carga. As dicas mudam conforme o seu veículo e os produtos que transporta.", "Pa viaja na seguransa i protehe karga. Dicas ta mudadu konformi bu veíkulu i produtus ki bu ta transporta.", "Pour voyager en sécurité et protéger la cargaison. Les conseils varient selon votre véhicule et les produits transportés."],
  ["Comunicar acidente, avaria ou ocorrência", "Komunika asidenti, avaria o okorrénsia", "Signaler un accident, une panne ou un incident"],
  ["Acidentes e avarias a meio de uma entrega avisam também o comprador e o vendedor.", "Asidentis i avarias na metadi di entrega ta avisa tambi kumpradur i vendedor.", "Les accidents et pannes en cours de livraison préviennent aussi l'acheteur et le vendeur."],
  ["Ocorrência", "Okorrénsia", "Incident"],
  ["Denunciar atividade suspeita", "Denunsia atividadi suspeitu", "Signaler une activité suspecte"],
  ["Avisa agora a equipa NÔDJUNTA. A sua localização só vai se o autorizar. Em perigo de vida, ligue também para os serviços de emergência.", "Avisa agora ekipa NÔDJUNTA. Bu lokalizason so ta ba si bu autoriza. Si sta na perigu di vida, liga tambi pa servisus di emerjénsia.", "Prévenez maintenant l'équipe NÔDJUNTA. Votre position n'est envoyée que si vous l'autorisez. En cas de danger de mort, appelez aussi les services d'urgence."],
  ["Guarde pessoas de confiança. Depois de um SOS, o app oferece avisá-las com a sua localização.", "Guarda pesoas di konfiansa. Dipus di un SOS, app ta oferese avisa-s ku bu lokalizason.", "Enregistrez des personnes de confiance. Après un SOS, l'app propose de les prévenir avec votre position."],
  ["Ainda não tem contactos de emergência guardados. Guarde-os mais abaixo.", "Bu inda ka ten kontaktus di emerjénsia guardadu. Guarda-s mas di baxu.", "Vous n'avez pas encore de contacts d'urgence enregistrés. Enregistrez-les plus bas."],
  ["Alertas de estrada e clima", "Alertas di strada i klima", "Alertes routières et météo"],
  ["Alertas pelo caminho", "Alertas na kaminhu", "Alertes sur le trajet"],

  // Transportador: serviços, perfil e geral
  ["Ferramentas e serviços", "Ferramentas i servisus", "Outils et services"],
  ["Conhece um posto, uma oficina ou outro serviço que falta na lista? Sugira-o. Pode ter até 5 sugestões em análise.", "Bu konxe un postu, ofisina o otru servisu ki ta falta na lista? Sujeri-l. Bu pode ten te 5 sujestons na analiza.", "Vous connaissez un poste, un atelier ou un autre service qui manque dans la liste ? Suggérez-le. Vous pouvez avoir jusqu'à 5 suggestions en cours d'analyse."],
  ["Os postos e oficinas são publicados pela equipa NÔDJUNTA. Se conhece algum, sugira-o: depois de analisado, aparece para todos os transportadores.", "Postus i ofisinas é publikadu pa ekipa NÔDJUNTA. Si bu konxe algun, sujeri-l: dipus di analizadu, ta paresi pa tudu transportadoris.", "Les postes et ateliers sont publiés par l'équipe NÔDJUNTA. Si vous en connaissez un, suggérez-le : après analyse, il apparaît pour tous les transporteurs."],
  ["Ainda não há locais publicados", "Inda ka ten lokais publikadu", "Aucun lieu publié pour le moment"],
  ["Nenhum local encontrado", "Nhun lokal enkontradu", "Aucun lieu trouvé"],
  ["Editar o perfil", "Edita perfil", "Modifier le profil"],
  ["Idioma e conta", "Lingua i konta", "Langue et compte"],
  ["O número de telefone é o que usa para entrar. Para o mudar, fale com o suporte.", "Númeru di telefoni é kel ki bu ta uza pa entra. Pa muda-l, papia ku sopórti.", "Le numéro de téléphone est celui que vous utilisez pour vous connecter. Pour le changer, contactez l'assistance."],
  ["O que falta", "Kuse ki ta falta", "Ce qui manque"],
  ["O pedido fica ligado à sua encomenda.", "Pedidu ta fika ligadu a bu enkomenda.", "La demande reste liée à votre commande."],
  ["Os avisos da equipa NÔDJUNTA chegam-lhe por notificação.", "Avizus di ekipa NÔDJUNTA ta txiga pa bo pur notifikason.", "Les avis de l'équipe NÔDJUNTA vous parviennent par notification."],
  ["O comprador só vê o seu primeiro nome, o veículo e a classificação. O seu telefone só fica visível a quem tem uma entrega consigo. A sua localização só é partilhada durante uma entrega, e só se a deixar ligada.", "Kumpradur so ta odja bu primeru nómi, veíkulu i klasifikason. Bu telefoni so ta fika visível pa kil ki ten entrega ku bo. Bu lokalizason so ta partilhadu durante entrega, i so si bu dexa-l ligadu.", "L'acheteur ne voit que votre prénom, le véhicule et la note. Votre téléphone n'est visible que pour ceux qui ont une livraison avec vous. Votre position n'est partagée que pendant une livraison, et seulement si vous la laissez activée."],
  ["O comprovativo é uma foto da carga entregue ou do comprador a receber. O comprador, o vendedor e a equipa podem vê-lo.", "Komprovativu é un foto di karga entregadu o di kumpradur ta risibi. Kumpradur, vendedor i ekipa pode odja-l.", "La preuve est une photo du chargement livré ou de l'acheteur qui reçoit. L'acheteur, le vendeur et l'équipe peuvent la voir."],
  ["Fica ligado à entrega que tem aberta.", "Ta fika ligadu a entrega ki bu ten abertu.", "Reste lié à la livraison que vous avez ouverte."],
  ["Pedido enviado. A equipa foi avisada.", "Pedidu mandadu. Ekipa foi avizadu.", "Demande envoyée. L'équipe a été prévenue."],
  ["A calcular...", "Ta kalkula...", "Calcul en cours..."],
  ["Ações", "Asons", "Actions"],
  ["Ainda não há registos.", "Inda ka ten rejistus.", "Aucun enregistrement pour le moment."],
  ["NÔDJUNTA AGRO — Juntos pelo desenvolvimento de todos!", "NÔDJUNTA AGRO — Djuntu pa desenvolvimentu di tudu!", "NÔDJUNTA AGRO — Ensemble pour le développement de tous !"],
];

// Textos com uma parte fixa no início e um valor que muda (ex.: nome da região)
// [início em Português, início em Kriol, início em Français]
const PREFIXES: [string, string, string][] = [
  ["Entregas em ", "Entregas na ", "Livraisons à "],
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

// Detetor: escreve no terminal do Expo os textos que ainda não têm tradução
const FALTA = new Set<string>();
function reportar(s: string) {
  try {
    if (
      typeof __DEV__ !== "undefined" &&
      __DEV__ &&
      s.length < 220 &&
      /[A-Za-zÀ-ÿ]{3,}/.test(s) &&
      !FALTA.has(s)
    ) {
      FALTA.add(s);
      console.log("[FALTA] " + s);
    }
  } catch (e) {
    // ignora
  }
}

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

  // 4. Início fixo + valor variável (ex.: "Entregas em Bissau")
  const lower = s.toLowerCase();
  for (const [p, k, f] of PREFIXES) {
    if (lower.startsWith(p.toLowerCase())) {
      return (current === "crl" ? k : f) + s.slice(p.length);
    }
  }

  reportar(s);
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
