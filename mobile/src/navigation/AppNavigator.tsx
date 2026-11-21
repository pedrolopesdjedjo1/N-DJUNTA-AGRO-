import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AparenciaProvider } from "../context/AparenciaContext";
import { colors } from "../theme/colors";

import AddProductScreen from "../screens/AddProductScreen";
import AdminAgentCaseScreen from "../screens/AdminAgentCaseScreen";
import AdminAgentCasesScreen from "../screens/AdminAgentCasesScreen";
import AdminAgentCommissionsScreen from "../screens/AdminAgentCommissionsScreen";
import AdminAgentScreen from "../screens/AdminAgentScreen";
import AdminAgentSecurityScreen from "../screens/AdminAgentSecurityScreen";
import AdminAgentSignalsScreen from "../screens/AdminAgentSignalsScreen";
import AdminAgentsScreen from "../screens/AdminAgentsScreen";
import AdminConteudoScreen from "../screens/AdminConteudoScreen";
import AdminReportsScreen from "../screens/AdminReportsScreen";
import AdminScreen from "../screens/AdminScreen";
import AdminVerificationsScreen from "../screens/AdminVerificationsScreen";
import AgentActivityScreen from "../screens/AgentActivityScreen";
import AgentAssistScreen from "../screens/AgentAssistScreen";
import AgentCaseFormScreen from "../screens/AgentCaseFormScreen";
import AgentCaseScreen from "../screens/AgentCaseScreen";
import AgentClientFormScreen from "../screens/AgentClientFormScreen";
import AgentClientScreen from "../screens/AgentClientScreen";
import AgentClientsScreen from "../screens/AgentClientsScreen";
import AgentCommissionsScreen from "../screens/AgentCommissionsScreen";
import AgentCommunitiesScreen from "../screens/AgentCommunitiesScreen";
import AgentCooperativesScreen from "../screens/AgentCooperativesScreen";
import AgentDeliveryScreen from "../screens/AgentDeliveryScreen";
import AgentEarningsScreen from "../screens/AgentEarningsScreen";
import AgentHomeScreen from "../screens/AgentHomeScreen";
import AgentInviteScreen from "../screens/AgentInviteScreen";
import AgentMapScreen from "../screens/AgentMapScreen";
import AgentMarketScreen from "../screens/AgentMarketScreen";
import AgentNeedFormScreen from "../screens/AgentNeedFormScreen";
import AgentNeedsScreen from "../screens/AgentNeedsScreen";
import AgentOpportunitiesScreen from "../screens/AgentOpportunitiesScreen";
import AgentOrderScreen from "../screens/AgentOrderScreen";
import AgentOrdersScreen from "../screens/AgentOrdersScreen";
import AgentPaymentsScreen from "../screens/AgentPaymentsScreen";
import AgentProducersScreen from "../screens/AgentProducersScreen";
import AgentProductScreen from "../screens/AgentProductScreen";
import AgentProfileFormScreen from "../screens/AgentProfileFormScreen";
import AgentProfileScreen from "../screens/AgentProfileScreen";
import AgentPublicScreen from "../screens/AgentPublicScreen";
import AgentReportScreen from "../screens/AgentReportScreen";
import AgentSecurityScreen from "../screens/AgentSecurityScreen";
import AgentSessionsScreen from "../screens/AgentSessionsScreen";
import AgentTaskFormScreen from "../screens/AgentTaskFormScreen";
import AgentTasksScreen from "../screens/AgentTasksScreen";
import AgentTransportScreen from "../screens/AgentTransportScreen";
import AparenciaScreen from "../screens/AparenciaScreen";
import ArtisanCommunityScreen from "../screens/ArtisanCommunityScreen";
import ArtisanHomeScreen from "../screens/ArtisanHomeScreen";
import ArtisanMarketScreen from "../screens/ArtisanMarketScreen";
import ArtisanMaterialsScreen from "../screens/ArtisanMaterialsScreen";
import ArtisanOrdersScreen from "../screens/ArtisanOrdersScreen";
import ArtisanProductsScreen from "../screens/ArtisanProductsScreen";
import ArtisanProfileScreen from "../screens/ArtisanProfileScreen";
import ArtisanReviewsScreen from "../screens/ArtisanReviewsScreen";
import ArtisanSellScreen from "../screens/ArtisanSellScreen";
import BoAlertsScreen from "../screens/BoAlertsScreen";
import BoAuditScreen from "../screens/BoAuditScreen";
import BoBannerFormScreen from "../screens/BoBannerFormScreen";
import BoBannersScreen from "../screens/BoBannersScreen";
import BoBroadcastsScreen from "../screens/BoBroadcastsScreen";
import BoCategoriesScreen from "../screens/BoCategoriesScreen";
import BoCommissionsScreen from "../screens/BoCommissionsScreen";
import BoComplaintsScreen from "../screens/BoComplaintsScreen";
import BoContentListScreen from "../screens/BoContentListScreen";
import BoContentScreen from "../screens/BoContentScreen";
import BoCoopScreen from "../screens/BoCoopScreen";
import BoCoopsScreen from "../screens/BoCoopsScreen";
import BoDashboardScreen from "../screens/BoDashboardScreen";
import BoDeliveriesScreen from "../screens/BoDeliveriesScreen";
import BoDeliveryProblemsScreen from "../screens/BoDeliveryProblemsScreen";
import BoDeliveryScreen from "../screens/BoDeliveryScreen";
import BoDisputeScreen from "../screens/BoDisputeScreen";
import BoDisputesScreen from "../screens/BoDisputesScreen";
import BoEventScreen from "../screens/BoEventScreen";
import BoEventsScreen from "../screens/BoEventsScreen";
import BoFeaturedScreen from "../screens/BoFeaturedScreen";
import BoFinanceReportScreen from "../screens/BoFinanceReportScreen";
import BoFinanceScreen from "../screens/BoFinanceScreen";
import BoFlagsScreen from "../screens/BoFlagsScreen";
import BoGovListScreen from "../screens/BoGovListScreen";
import BoGovScreen from "../screens/BoGovScreen";
import BoHighlightsScreen from "../screens/BoHighlightsScreen";
import BoIdentityReviewScreen from "../screens/BoIdentityReviewScreen";
import BoIdentityScreen from "../screens/BoIdentityScreen";
import BoIncidentScreen from "../screens/BoIncidentScreen";
import BoIncidentsScreen from "../screens/BoIncidentsScreen";
import BoMarketScreen from "../screens/BoMarketScreen";
import BoOrderScreen from "../screens/BoOrderScreen";
import BoOrdersScreen from "../screens/BoOrdersScreen";
import BoOrgScreen from "../screens/BoOrgScreen";
import BoOrgsScreen from "../screens/BoOrgsScreen";
import BoPaymentsScreen from "../screens/BoPaymentsScreen";
import BoPayoutsScreen from "../screens/BoPayoutsScreen";
import BoProductScreen from "../screens/BoProductScreen";
import BoProfilesScreen from "../screens/BoProfilesScreen";
import BoQualityScreen from "../screens/BoQualityScreen";
import BoRefundScreen from "../screens/BoRefundScreen";
import BoRefundsScreen from "../screens/BoRefundsScreen";
import BoReportScreen from "../screens/BoReportScreen";
import BoReportsScreen from "../screens/BoReportsScreen";
import BoRoutesScreen from "../screens/BoRoutesScreen";
import BoSalesScreen from "../screens/BoSalesScreen";
import BoSecurityScreen from "../screens/BoSecurityScreen";
import BoServicePointFormScreen from "../screens/BoServicePointFormScreen";
import BoServicePointsScreen from "../screens/BoServicePointsScreen";
import BoSettingsScreen from "../screens/BoSettingsScreen";
import BoStatsGrowthScreen from "../screens/BoStatsGrowthScreen";
import BoStatsRegionsScreen from "../screens/BoStatsRegionsScreen";
import BoStatsReportScreen from "../screens/BoStatsReportScreen";
import BoStatsScreen from "../screens/BoStatsScreen";
import BoStatsSegmentScreen from "../screens/BoStatsSegmentScreen";
import BoSupportScreen from "../screens/BoSupportScreen";
import BoSystemScreen from "../screens/BoSystemScreen";
import BoTeamMemberScreen from "../screens/BoTeamMemberScreen";
import BoTeamPromoteScreen from "../screens/BoTeamPromoteScreen";
import BoTeamScreen from "../screens/BoTeamScreen";
import BoTicketScreen from "../screens/BoTicketScreen";
import BoTransactionsScreen from "../screens/BoTransactionsScreen";
import BoTransportRatingsScreen from "../screens/BoTransportRatingsScreen";
import BoTransportScreen from "../screens/BoTransportScreen";
import BoTransportVerificationScreen from "../screens/BoTransportVerificationScreen";
import BoTransportersScreen from "../screens/BoTransportersScreen";
import BoUserCreateScreen from "../screens/BoUserCreateScreen";
import BoUserEditScreen from "../screens/BoUserEditScreen";
import BoUserScreen from "../screens/BoUserScreen";
import BoUsersScreen from "../screens/BoUsersScreen";
import BuscaAvancadaScreen from "../screens/BuscaAvancadaScreen";
import CalculadoraScreen from "../screens/CalculadoraScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import ChatScreen from "../screens/ChatScreen";
import ClientAddressesScreen from "../screens/ClientAddressesScreen";
import ClientCartScreen from "../screens/ClientCartScreen";
import ClientCheckoutScreen from "../screens/ClientCheckoutScreen";
import ClientExploreScreen from "../screens/ClientExploreScreen";
import ClientFavoritesScreen from "../screens/ClientFavoritesScreen";
import ClientHomeScreen from "../screens/ClientHomeScreen";
import ClientMyReviewsScreen from "../screens/ClientMyReviewsScreen";
import ClientOrderScreen from "../screens/ClientOrderScreen";
import ClientOrdersScreen from "../screens/ClientOrdersScreen";
import ClientPaymentMethodsScreen from "../screens/ClientPaymentMethodsScreen";
import ClientPaymentsScreen from "../screens/ClientPaymentsScreen";
import ClientProductScreen from "../screens/ClientProductScreen";
import ClientProfileScreen from "../screens/ClientProfileScreen";
import ClientReceiptScreen from "../screens/ClientReceiptScreen";
import ClientReviewScreen from "../screens/ClientReviewScreen";
import ClientSellerScreen from "../screens/ClientSellerScreen";
import ClientSupportScreen from "../screens/ClientSupportScreen";
import ConversationsScreen from "../screens/ConversationsScreen";
import CooperativesScreen from "../screens/CooperativesScreen";
import DevicesScreen from "../screens/DevicesScreen";
import EventsScreen from "../screens/EventsScreen";
import FarmerCooperativeScreen from "../screens/FarmerCooperativeScreen";
import FarmerCooperativesScreen from "../screens/FarmerCooperativesScreen";
import FarmerHelpScreen from "../screens/FarmerHelpScreen";
import FarmerHomeScreen from "../screens/FarmerHomeScreen";
import FarmerOrdersScreen from "../screens/FarmerOrdersScreen";
import FarmerPricesScreen from "../screens/FarmerPricesScreen";
import FarmerProductionScreen from "../screens/FarmerProductionScreen";
import FarmerProfileScreen from "../screens/FarmerProfileScreen";
import FarmerResourcesScreen from "../screens/FarmerResourcesScreen";
import FarmerSellScreen from "../screens/FarmerSellScreen";
import FarmerTransportScreen from "../screens/FarmerTransportScreen";
import FarmerWeatherScreen from "../screens/FarmerWeatherScreen";
import FerramentasScreen from "../screens/FerramentasScreen";
import FisherCatchesScreen from "../screens/FisherCatchesScreen";
import FisherConservationScreen from "../screens/FisherConservationScreen";
import FisherCooperativesScreen from "../screens/FisherCooperativesScreen";
import FisherEquipmentScreen from "../screens/FisherEquipmentScreen";
import FisherHomeScreen from "../screens/FisherHomeScreen";
import FisherOrdersScreen from "../screens/FisherOrdersScreen";
import FisherPricesScreen from "../screens/FisherPricesScreen";
import FisherProfileScreen from "../screens/FisherProfileScreen";
import FisherSeaScreen from "../screens/FisherSeaScreen";
import FisherSellScreen from "../screens/FisherSellScreen";
import FisherSosScreen from "../screens/FisherSosScreen";
import GovAlertFormScreen from "../screens/GovAlertFormScreen";
import GovAlertScreen from "../screens/GovAlertScreen";
import GovAlertsScreen from "../screens/GovAlertsScreen";
import GovAreaScreen from "../screens/GovAreaScreen";
import GovCommunicationScreen from "../screens/GovCommunicationScreen";
import GovDataScreen from "../screens/GovDataScreen";
import GovHomeScreen from "../screens/GovHomeScreen";
import GovInstitutionsScreen from "../screens/GovInstitutionsScreen";
import GovMapScreen from "../screens/GovMapScreen";
import GovMyReportScreen from "../screens/GovMyReportScreen";
import GovMyReportsScreen from "../screens/GovMyReportsScreen";
import GovPlaceFormScreen from "../screens/GovPlaceFormScreen";
import GovPlaceScreen from "../screens/GovPlaceScreen";
import GovPlacesScreen from "../screens/GovPlacesScreen";
import GovProfileFormScreen from "../screens/GovProfileFormScreen";
import GovProfileScreen from "../screens/GovProfileScreen";
import GovProgramFormScreen from "../screens/GovProgramFormScreen";
import GovProgramScreen from "../screens/GovProgramScreen";
import GovProjectsScreen from "../screens/GovProjectsScreen";
import GovPublicProgramScreen from "../screens/GovPublicProgramScreen";
import GovPublicProgramsScreen from "../screens/GovPublicProgramsScreen";
import GovReportFormScreen from "../screens/GovReportFormScreen";
import GovReportScreen from "../screens/GovReportScreen";
import GovReportsScreen from "../screens/GovReportsScreen";
import GovServiceFormScreen from "../screens/GovServiceFormScreen";
import GovServiceScreen from "../screens/GovServiceScreen";
import GovServicesScreen from "../screens/GovServicesScreen";
import GovTrackScreen from "../screens/GovTrackScreen";
import GovVerificationScreen from "../screens/GovVerificationScreen";
import GovWeatherScreen from "../screens/GovWeatherScreen";
import HelpScreen from "../screens/HelpScreen";
import HomeScreen from "../screens/HomeScreen";
import LanguageScreen from "../screens/LanguageScreen";
import LearningScreen from "../screens/LearningScreen";
import LegalScreen from "../screens/LegalScreen";
import LoginScreen from "../screens/LoginScreen";
import MerchantCustomersScreen from "../screens/MerchantCustomersScreen";
import MerchantDeliveriesScreen from "../screens/MerchantDeliveriesScreen";
import MerchantHomeScreen from "../screens/MerchantHomeScreen";
import MerchantOrdersScreen from "../screens/MerchantOrdersScreen";
import MerchantProductsScreen from "../screens/MerchantProductsScreen";
import MerchantPromotionsScreen from "../screens/MerchantPromotionsScreen";
import MerchantSalesScreen from "../screens/MerchantSalesScreen";
import MyAgentActivityScreen from "../screens/MyAgentActivityScreen";
import MyAgentsScreen from "../screens/MyAgentsScreen";
import MyReportsScreen from "../screens/MyReportsScreen";
import NgoApplicantsScreen from "../screens/NgoApplicantsScreen";
import NgoAreaProjectsScreen from "../screens/NgoAreaProjectsScreen";
import NgoBeneficiariesScreen from "../screens/NgoBeneficiariesScreen";
import NgoBeneficiaryFormScreen from "../screens/NgoBeneficiaryFormScreen";
import NgoCertificateScreen from "../screens/NgoCertificateScreen";
import NgoCommunitiesScreen from "../screens/NgoCommunitiesScreen";
import NgoCommunityFormScreen from "../screens/NgoCommunityFormScreen";
import NgoCommunityScreen from "../screens/NgoCommunityScreen";
import NgoDiscoverScreen from "../screens/NgoDiscoverScreen";
import NgoExpensesScreen from "../screens/NgoExpensesScreen";
import NgoFinanceReportScreen from "../screens/NgoFinanceReportScreen";
import NgoFundingFormScreen from "../screens/NgoFundingFormScreen";
import NgoFundingScreen from "../screens/NgoFundingScreen";
import NgoHomeScreen from "../screens/NgoHomeScreen";
import NgoMapScreen from "../screens/NgoMapScreen";
import NgoMonitoringScreen from "../screens/NgoMonitoringScreen";
import NgoMyRequestsScreen from "../screens/NgoMyRequestsScreen";
import NgoMyTrainingsScreen from "../screens/NgoMyTrainingsScreen";
import NgoNeedFormScreen from "../screens/NgoNeedFormScreen";
import NgoNeedsScreen from "../screens/NgoNeedsScreen";
import NgoOpportunitiesScreen from "../screens/NgoOpportunitiesScreen";
import NgoOpportunityFormScreen from "../screens/NgoOpportunityFormScreen";
import NgoOpportunityScreen from "../screens/NgoOpportunityScreen";
import NgoOrganizationsScreen from "../screens/NgoOrganizationsScreen";
import NgoPartnerFormScreen from "../screens/NgoPartnerFormScreen";
import NgoPartnerScreen from "../screens/NgoPartnerScreen";
import NgoPartnersScreen from "../screens/NgoPartnersScreen";
import NgoProfileFormScreen from "../screens/NgoProfileFormScreen";
import NgoProfileScreen from "../screens/NgoProfileScreen";
import NgoProjectFormScreen from "../screens/NgoProjectFormScreen";
import NgoProjectScreen from "../screens/NgoProjectScreen";
import NgoProjectsScreen from "../screens/NgoProjectsScreen";
import NgoPublicOrganizationScreen from "../screens/NgoPublicOrganizationScreen";
import NgoPublicProjectScreen from "../screens/NgoPublicProjectScreen";
import NgoPublicationFormScreen from "../screens/NgoPublicationFormScreen";
import NgoPublicationScreen from "../screens/NgoPublicationScreen";
import NgoPublicationsScreen from "../screens/NgoPublicationsScreen";
import NgoReportScreen from "../screens/NgoReportScreen";
import NgoRequestFormScreen from "../screens/NgoRequestFormScreen";
import NgoRequestsScreen from "../screens/NgoRequestsScreen";
import NgoTrainingBrowseScreen from "../screens/NgoTrainingBrowseScreen";
import NgoTrainingFormScreen from "../screens/NgoTrainingFormScreen";
import NgoTrainingPublicScreen from "../screens/NgoTrainingPublicScreen";
import NgoTrainingScreen from "../screens/NgoTrainingScreen";
import NgoVerificationScreen from "../screens/NgoVerificationScreen";
import NgoVerificationsAdminScreen from "../screens/NgoVerificationsAdminScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import PerfilVendedorScreen from "../screens/PerfilVendedorScreen";
import ProductsScreen from "../screens/ProductsScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ReportCreateScreen from "../screens/ReportCreateScreen";
import RescueSosScreen from "../screens/RescueSosScreen";
import ReviewsScreen from "../screens/ReviewsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import StoreProfileScreen from "../screens/StoreProfileScreen";
import SupportScreen from "../screens/SupportScreen";
import TrCombineScreen from "../screens/TrCombineScreen";
import TrContactHistoryScreen from "../screens/TrContactHistoryScreen";
import TrContactsScreen from "../screens/TrContactsScreen";
import TrDeliveriesScreen from "../screens/TrDeliveriesScreen";
import TrDeliveryScreen from "../screens/TrDeliveryScreen";
import TrEarningsScreen from "../screens/TrEarningsScreen";
import TrEmergencyScreen from "../screens/TrEmergencyScreen";
import TrExpensesScreen from "../screens/TrExpensesScreen";
import TrFinanceReportScreen from "../screens/TrFinanceReportScreen";
import TrHomeScreen from "../screens/TrHomeScreen";
import TrIncidentScreen from "../screens/TrIncidentScreen";
import TrLoadsScreen from "../screens/TrLoadsScreen";
import TrMapScreen from "../screens/TrMapScreen";
import TrOfferFormScreen from "../screens/TrOfferFormScreen";
import TrPaymentsScreen from "../screens/TrPaymentsScreen";
import TrProfileEditScreen from "../screens/TrProfileEditScreen";
import TrProfileScreen from "../screens/TrProfileScreen";
import TrReputationScreen from "../screens/TrReputationScreen";
import TrRoutePlanScreen from "../screens/TrRoutePlanScreen";
import TrSafetyScreen from "../screens/TrSafetyScreen";
import TrSecurityScreen from "../screens/TrSecurityScreen";
import TrServiceSuggestScreen from "../screens/TrServiceSuggestScreen";
import TrServicesScreen from "../screens/TrServicesScreen";
import TrSettingsScreen from "../screens/TrSettingsScreen";
import TrToolsScreen from "../screens/TrToolsScreen";
import TrVehicleFormScreen from "../screens/TrVehicleFormScreen";
import TrVehicleScreen from "../screens/TrVehicleScreen";
import TransportOffersScreen from "../screens/TransportOffersScreen";
import TransporterVerificationScreen from "../screens/TransporterVerificationScreen";
import VerificationScreen from "../screens/VerificationScreen";

const Stack = createNativeStackNavigator();

const VERDE = "#1B7F3B";

const cabecalho = {
  headerStyle: { backgroundColor: VERDE },
  headerTintColor: "#FFFFFF",
  headerTitleStyle: { fontWeight: "800" as const, fontSize: 18 },
  headerShadowVisible: false,
  statusBarStyle: "light" as const,
  animation: "slide_from_right" as const,
};

// Primeira tela de cada perfil
const AREA_POR_PERFIL: Record<string, string> = {
  AGRICULTOR: "FarmerHome",
  PESCADOR: "FisherHome",
  COMERCIANTE: "MerchantHome",
  ARTESAO: "ArtisanHome",
  COMPRADOR: "ClientHome",
  TRANSPORTADOR: "TrHome",
  GOVERNO: "GovHome",
  ONG: "NgoHome",
  AGENTE_DIGITAL: "AgentHome",
  ADMIN: "BoDashboard",
};

// Rota "Area": abre a área do perfil de quem entrou
function AreaScreen({ navigation }: any) {
  const { user } = useAuth() as any;
  useEffect(() => {
    const destino = AREA_POR_PERFIL[user?.role ?? ""] ?? "Home";
    navigation.replace(destino);
  }, []);
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={VERDE} />
    </View>
  );
}

// Títulos em português a partir do nome da rota
const PALAVRAS: Record<string, string> = {
  Farmer: "Agricultor", Fisher: "Pescador", Client: "Cliente", Merchant: "Comerciante",
  Artisan: "Artesão", Gov: "Governo", Ngo: "ONG", Tr: "Transportador", Bo: "Admin",
  Agent: "Agente", Admin: "Admin", Prices: "Preços", Price: "Preço", Orders: "Pedidos",
  Order: "Pedido", Products: "Produtos", Product: "Produto", Profile: "Perfil",
  Home: "Início", Sell: "Vender", Weather: "Clima", Help: "Ajuda", Support: "Suporte",
  Settings: "Configurações", Reports: "Denúncias", Report: "Relatório", Reviews: "Avaliações",
  Review: "Avaliação", Cart: "Carrinho", Explore: "Explorar", Favorites: "Favoritos",
  Payments: "Pagamentos", Payment: "Pagamento", Verification: "Verificação",
  Verifications: "Verificações", Cooperatives: "Cooperativas", Cooperative: "Cooperativa",
  Projects: "Projetos", Project: "Projeto", Communities: "Comunidades", Community: "Comunidade",
  Opportunities: "Oportunidades", Opportunity: "Oportunidade", Map: "Mapa", Form: "Formulário",
  Earnings: "Ganhos", Deliveries: "Entregas", Delivery: "Entrega", Vehicle: "Veículo",
  Tools: "Ferramentas", Training: "Formação", Trainings: "Formações", Partners: "Parceiros",
  Partner: "Parceiro", Needs: "Necessidades", Need: "Necessidade", Funding: "Financiamento",
  Alerts: "Alertas", Alert: "Alerta", Programs: "Programas", Program: "Programa",
  Services: "Serviços", Service: "Serviço", Places: "Locais", Place: "Local", Data: "Dados",
  Team: "Equipa", Users: "Utilizadores", User: "Utilizador", Security: "Segurança",
  System: "Sistema", Finance: "Financeiro", Market: "Mercado", Sales: "Vendas",
  Customers: "Clientes", Promotions: "Promoções", Materials: "Materiais", Catches: "Capturas",
  Sea: "Mar", Sos: "SOS", Equipment: "Equipamentos", Conservation: "Conservação",
  Resources: "Recursos", Production: "Produção", Clients: "Clientes", Tasks: "Tarefas",
  Task: "Tarefa", Cases: "Casos", Case: "Caso", Sessions: "Sessões", Commissions: "Comissões",
  Activity: "Atividade", Producers: "Produtores", Transport: "Transporte", Contacts: "Contactos",
  Expenses: "Despesas", Loads: "Cargas", Routes: "Rotas", Route: "Rota", Plan: "Plano",
  Safety: "Segurança", Emergency: "Emergência", Incident: "Incidente", Incidents: "Incidentes",
  Content: "Conteúdo", Events: "Eventos", Event: "Evento", Disputes: "Disputas",
  Dispute: "Disputa", Refunds: "Reembolsos", Refund: "Reembolso", Banners: "Banners",
  Broadcasts: "Avisos", Stats: "Estatísticas", Audit: "Auditoria", Flags: "Alertas",
  Quality: "Qualidade", Categories: "Categorias", Highlights: "Destaques", Featured: "Destaques",
  Complaints: "Reclamações", Tickets: "Pedidos de ajuda", Ticket: "Pedido de ajuda",
  Transactions: "Transações", Payouts: "Pagamentos a enviar", Orgs: "Organizações",
  Org: "Organização", Public: "Público", Publications: "Publicações", Publication: "Publicação",
  Beneficiaries: "Beneficiários", Beneficiary: "Beneficiário", Monitoring: "Monitoramento",
  Certificate: "Certificado", Applicants: "Candidatos", Discover: "Descobrir",
  Browse: "Explorar", My: "Os meus", Requests: "Pedidos", Request: "Pedido", Add: "Adicionar",
  Create: "Criar", Edit: "Editar", Seller: "Vendedor", Receipt: "Recibo", Checkout: "Encomenda",
  Addresses: "Moradas", Methods: "Métodos", Area: "Área", Institutions: "Instituições",
  Communication: "Comunicação", Track: "Rastreio", Reputation: "Reputação", Combine: "Combinar",
  Suggest: "Sugerir", History: "Histórico", Business: "Negócio", Invite: "Convidar",
  Assist: "Ajuda ao cliente", Needs2: "Necessidades", Public2: "Público",
};

function titulo(nome: string): string {
  const partes = nome.match(/[A-Z][a-z0-9]*/g) ?? [nome];
  return partes.map((p) => PALAVRAS[p] ?? p).join(" ");
}

// Estas telas têm o seu próprio menu/cabeçalho, por isso não mostram o cabeçalho do sistema
const SEM_CABECALHO = new Set<string>([

  "AgentClients",
  "AgentEarnings",
  "AgentHome",
  "AgentMap",
  "AgentMarket",
  "AgentNeeds",
  "AgentOpportunities",
  "AgentOrders",
  "AgentProfile",
  "AgentTasks",
  "AgentTransport",
  "ArtisanHome",
  "ArtisanOrders",
  "ArtisanProducts",
  "ArtisanProfile",
  "ArtisanSell",
  "BoAlerts",
  "BoAudit",
  "BoBannerForm",
  "BoBanners",
  "BoBroadcasts",
  "BoCategories",
  "BoCommissions",
  "BoComplaints",
  "BoContent",
  "BoContentList",
  "BoCoop",
  "BoCoops",
  "BoDashboard",
  "BoDeliveries",
  "BoDelivery",
  "BoDeliveryProblems",
  "BoDispute",
  "BoDisputes",
  "BoEvent",
  "BoEvents",
  "BoFeatured",
  "BoFinance",
  "BoFinanceReport",
  "BoFlags",
  "BoGov",
  "BoGovList",
  "BoHighlights",
  "BoIdentity",
  "BoIdentityReview",
  "BoIncident",
  "BoIncidents",
  "BoMarket",
  "BoOrder",
  "BoOrders",
  "BoOrg",
  "BoOrgs",
  "BoPayments",
  "BoPayouts",
  "BoProduct",
  "BoProfiles",
  "BoQuality",
  "BoRefund",
  "BoRefunds",
  "BoReport",
  "BoReports",
  "BoRoutes",
  "BoSales",
  "BoSecurity",
  "BoServicePointForm",
  "BoServicePoints",
  "BoSettings",
  "BoStats",
  "BoStatsGrowth",
  "BoStatsRegions",
  "BoStatsReport",
  "BoStatsSegment",
  "BoSupport",
  "BoSystem",
  "BoTeam",
  "BoTeamMember",
  "BoTeamPromote",
  "BoTicket",
  "BoTransactions",
  "BoTransport",
  "BoTransportRatings",
  "BoTransportVerification",
  "BoTransporters",
  "BoUser",
  "BoUserCreate",
  "BoUserEdit",
  "BoUsers",
  "ClientCart",
  "ClientExplore",
  "ClientHome",
  "ClientOrders",
  "ClientProfile",
  "FarmerHome",
  "FarmerOrders",
  "FarmerProduction",
  "FarmerProfile",
  "FarmerSell",
  "FisherCatches",
  "FisherHome",
  "FisherOrders",
  "FisherProfile",
  "FisherSea",
  "FisherSell",
  "FisherSos",
  "GovCommunication",
  "GovData",
  "GovHome",
  "GovProfile",
  "GovProjects",
  "GovReports",
  "Home",
  "MerchantHome",
  "MerchantOrders",
  "MerchantProducts",
  "MerchantSales",
  "NgoCommunities",
  "NgoHome",
  "NgoOpportunities",
  "NgoProfile",
  "NgoProjects",
  "StoreProfile",
  "TrCombine",
  "TrContactHistory",
  "TrContacts",
  "TrDeliveries",
  "TrDelivery",
  "TrEarnings",
  "TrEmergency",
  "TrExpenses",
  "TrFinanceReport",
  "TrHome",
  "TrIncident",
  "TrLoads",
  "TrMap",
  "TrOfferForm",
  "TrPayments",
  "TrProfile",
  "TrProfileEdit",
  "TrReputation",
  "TrRoutePlan",
  "TrSafety",
  "TrSecurity",
  "TrServiceSuggest",
  "TrServices",
  "TrSettings",
  "TrTools",
  "TrVehicle",
  "TrVehicleForm",
]);

// Títulos que não seguem a regra automática
const TITULOS: Record<string, string> = {
  AddProduct: "Cadastrar Produto",
  Products: "Produtos",
  Reviews: "Avaliações",
  Ferramentas: "Ferramentas",
  BuscaAvancada: "Busca avançada",
  Calculadora: "Calculadora",
  Aparencia: "Aparência",
  AdminConteudo: "Conteúdo",
  AdminReports: "Denúncias",
  AdminVerifications: "Verificações",
  PerfilVendedor: "Perfil",
  ReportCreate: "Denunciar",
  MyReports: "As minhas denúncias",
};

const TELAS: Array<[string, React.ComponentType<any>]> = [

  ["AddProduct", AddProductScreen],
  ["AdminAgentCase", AdminAgentCaseScreen],
  ["AdminAgentCases", AdminAgentCasesScreen],
  ["AdminAgentCommissions", AdminAgentCommissionsScreen],
  ["AdminAgent", AdminAgentScreen],
  ["AdminAgentSecurity", AdminAgentSecurityScreen],
  ["AdminAgentSignals", AdminAgentSignalsScreen],
  ["AdminAgents", AdminAgentsScreen],
  ["AdminConteudo", AdminConteudoScreen],
  ["AdminReports", AdminReportsScreen],
  ["Admin", AdminScreen],
  ["AdminVerifications", AdminVerificationsScreen],
  ["AgentActivity", AgentActivityScreen],
  ["AgentAssist", AgentAssistScreen],
  ["AgentCaseForm", AgentCaseFormScreen],
  ["AgentCase", AgentCaseScreen],
  ["AgentClientForm", AgentClientFormScreen],
  ["AgentClient", AgentClientScreen],
  ["AgentClients", AgentClientsScreen],
  ["AgentCommissions", AgentCommissionsScreen],
  ["AgentCommunities", AgentCommunitiesScreen],
  ["AgentCooperatives", AgentCooperativesScreen],
  ["AgentDelivery", AgentDeliveryScreen],
  ["AgentEarnings", AgentEarningsScreen],
  ["AgentHome", AgentHomeScreen],
  ["AgentInvite", AgentInviteScreen],
  ["AgentMap", AgentMapScreen],
  ["AgentMarket", AgentMarketScreen],
  ["AgentNeedForm", AgentNeedFormScreen],
  ["AgentNeeds", AgentNeedsScreen],
  ["AgentOpportunities", AgentOpportunitiesScreen],
  ["AgentOrder", AgentOrderScreen],
  ["AgentOrders", AgentOrdersScreen],
  ["AgentPayments", AgentPaymentsScreen],
  ["AgentProducers", AgentProducersScreen],
  ["AgentProduct", AgentProductScreen],
  ["AgentProfileForm", AgentProfileFormScreen],
  ["AgentProfile", AgentProfileScreen],
  ["AgentPublic", AgentPublicScreen],
  ["AgentReport", AgentReportScreen],
  ["AgentSecurity", AgentSecurityScreen],
  ["AgentSessions", AgentSessionsScreen],
  ["AgentTaskForm", AgentTaskFormScreen],
  ["AgentTasks", AgentTasksScreen],
  ["AgentTransport", AgentTransportScreen],
  ["Aparencia", AparenciaScreen],
  ["ArtisanCommunity", ArtisanCommunityScreen],
  ["ArtisanHome", ArtisanHomeScreen],
  ["ArtisanMarket", ArtisanMarketScreen],
  ["ArtisanMaterials", ArtisanMaterialsScreen],
  ["ArtisanOrders", ArtisanOrdersScreen],
  ["ArtisanProducts", ArtisanProductsScreen],
  ["ArtisanProfile", ArtisanProfileScreen],
  ["ArtisanReviews", ArtisanReviewsScreen],
  ["ArtisanSell", ArtisanSellScreen],
  ["BoAlerts", BoAlertsScreen],
  ["BoAudit", BoAuditScreen],
  ["BoBannerForm", BoBannerFormScreen],
  ["BoBanners", BoBannersScreen],
  ["BoBroadcasts", BoBroadcastsScreen],
  ["BoCategories", BoCategoriesScreen],
  ["BoCommissions", BoCommissionsScreen],
  ["BoComplaints", BoComplaintsScreen],
  ["BoContentList", BoContentListScreen],
  ["BoContent", BoContentScreen],
  ["BoCoop", BoCoopScreen],
  ["BoCoops", BoCoopsScreen],
  ["BoDashboard", BoDashboardScreen],
  ["BoDeliveries", BoDeliveriesScreen],
  ["BoDeliveryProblems", BoDeliveryProblemsScreen],
  ["BoDelivery", BoDeliveryScreen],
  ["BoDispute", BoDisputeScreen],
  ["BoDisputes", BoDisputesScreen],
  ["BoEvent", BoEventScreen],
  ["BoEvents", BoEventsScreen],
  ["BoFeatured", BoFeaturedScreen],
  ["BoFinanceReport", BoFinanceReportScreen],
  ["BoFinance", BoFinanceScreen],
  ["BoFlags", BoFlagsScreen],
  ["BoGovList", BoGovListScreen],
  ["BoGov", BoGovScreen],
  ["BoHighlights", BoHighlightsScreen],
  ["BoIdentityReview", BoIdentityReviewScreen],
  ["BoIdentity", BoIdentityScreen],
  ["BoIncident", BoIncidentScreen],
  ["BoIncidents", BoIncidentsScreen],
  ["BoMarket", BoMarketScreen],
  ["BoOrder", BoOrderScreen],
  ["BoOrders", BoOrdersScreen],
  ["BoOrg", BoOrgScreen],
  ["BoOrgs", BoOrgsScreen],
  ["BoPayments", BoPaymentsScreen],
  ["BoPayouts", BoPayoutsScreen],
  ["BoProduct", BoProductScreen],
  ["BoProfiles", BoProfilesScreen],
  ["BoQuality", BoQualityScreen],
  ["BoRefund", BoRefundScreen],
  ["BoRefunds", BoRefundsScreen],
  ["BoReport", BoReportScreen],
  ["BoReports", BoReportsScreen],
  ["BoRoutes", BoRoutesScreen],
  ["BoSales", BoSalesScreen],
  ["BoSecurity", BoSecurityScreen],
  ["BoServicePointForm", BoServicePointFormScreen],
  ["BoServicePoints", BoServicePointsScreen],
  ["BoSettings", BoSettingsScreen],
  ["BoStatsGrowth", BoStatsGrowthScreen],
  ["BoStatsRegions", BoStatsRegionsScreen],
  ["BoStatsReport", BoStatsReportScreen],
  ["BoStats", BoStatsScreen],
  ["BoStatsSegment", BoStatsSegmentScreen],
  ["BoSupport", BoSupportScreen],
  ["BoSystem", BoSystemScreen],
  ["BoTeamMember", BoTeamMemberScreen],
  ["BoTeamPromote", BoTeamPromoteScreen],
  ["BoTeam", BoTeamScreen],
  ["BoTicket", BoTicketScreen],
  ["BoTransactions", BoTransactionsScreen],
  ["BoTransportRatings", BoTransportRatingsScreen],
  ["BoTransport", BoTransportScreen],
  ["BoTransportVerification", BoTransportVerificationScreen],
  ["BoTransporters", BoTransportersScreen],
  ["BoUserCreate", BoUserCreateScreen],
  ["BoUserEdit", BoUserEditScreen],
  ["BoUser", BoUserScreen],
  ["BoUsers", BoUsersScreen],
  ["BuscaAvancada", BuscaAvancadaScreen],
  ["Calculadora", CalculadoraScreen],
  ["ChangePassword", ChangePasswordScreen],
  ["Chat", ChatScreen],
  ["ClientAddresses", ClientAddressesScreen],
  ["ClientCart", ClientCartScreen],
  ["ClientCheckout", ClientCheckoutScreen],
  ["ClientExplore", ClientExploreScreen],
  ["ClientFavorites", ClientFavoritesScreen],
  ["ClientHome", ClientHomeScreen],
  ["ClientMyReviews", ClientMyReviewsScreen],
  ["ClientOrder", ClientOrderScreen],
  ["ClientOrders", ClientOrdersScreen],
  ["ClientPaymentMethods", ClientPaymentMethodsScreen],
  ["ClientPayments", ClientPaymentsScreen],
  ["ClientProduct", ClientProductScreen],
  ["ClientProfile", ClientProfileScreen],
  ["ClientReceipt", ClientReceiptScreen],
  ["ClientReview", ClientReviewScreen],
  ["ClientSeller", ClientSellerScreen],
  ["ClientSupport", ClientSupportScreen],
  ["Conversations", ConversationsScreen],
  ["Cooperatives", CooperativesScreen],
  ["Devices", DevicesScreen],
  ["Events", EventsScreen],
  ["FarmerCooperative", FarmerCooperativeScreen],
  ["FarmerCooperatives", FarmerCooperativesScreen],
  ["FarmerHelp", FarmerHelpScreen],
  ["FarmerHome", FarmerHomeScreen],
  ["FarmerOrders", FarmerOrdersScreen],
  ["FarmerPrices", FarmerPricesScreen],
  ["FarmerProduction", FarmerProductionScreen],
  ["FarmerProfile", FarmerProfileScreen],
  ["FarmerResources", FarmerResourcesScreen],
  ["FarmerSell", FarmerSellScreen],
  ["FarmerTransport", FarmerTransportScreen],
  ["FarmerWeather", FarmerWeatherScreen],
  ["Ferramentas", FerramentasScreen],
  ["FisherCatches", FisherCatchesScreen],
  ["FisherConservation", FisherConservationScreen],
  ["FisherCooperatives", FisherCooperativesScreen],
  ["FisherEquipment", FisherEquipmentScreen],
  ["FisherHome", FisherHomeScreen],
  ["FisherOrders", FisherOrdersScreen],
  ["FisherPrices", FisherPricesScreen],
  ["FisherProfile", FisherProfileScreen],
  ["FisherSea", FisherSeaScreen],
  ["FisherSell", FisherSellScreen],
  ["FisherSos", FisherSosScreen],
  ["GovAlertForm", GovAlertFormScreen],
  ["GovAlert", GovAlertScreen],
  ["GovAlerts", GovAlertsScreen],
  ["GovArea", GovAreaScreen],
  ["GovCommunication", GovCommunicationScreen],
  ["GovData", GovDataScreen],
  ["GovHome", GovHomeScreen],
  ["GovInstitutions", GovInstitutionsScreen],
  ["GovMap", GovMapScreen],
  ["GovMyReport", GovMyReportScreen],
  ["GovMyReports", GovMyReportsScreen],
  ["GovPlaceForm", GovPlaceFormScreen],
  ["GovPlace", GovPlaceScreen],
  ["GovPlaces", GovPlacesScreen],
  ["GovProfileForm", GovProfileFormScreen],
  ["GovProfile", GovProfileScreen],
  ["GovProgramForm", GovProgramFormScreen],
  ["GovProgram", GovProgramScreen],
  ["GovProjects", GovProjectsScreen],
  ["GovPublicProgram", GovPublicProgramScreen],
  ["GovPublicPrograms", GovPublicProgramsScreen],
  ["GovReportForm", GovReportFormScreen],
  ["GovReport", GovReportScreen],
  ["GovReports", GovReportsScreen],
  ["GovServiceForm", GovServiceFormScreen],
  ["GovService", GovServiceScreen],
  ["GovServices", GovServicesScreen],
  ["GovTrack", GovTrackScreen],
  ["GovVerification", GovVerificationScreen],
  ["GovWeather", GovWeatherScreen],
  ["Help", HelpScreen],
  ["Language", LanguageScreen],
  ["Learning", LearningScreen],
  ["Legal", LegalScreen],
  ["MerchantCustomers", MerchantCustomersScreen],
  ["MerchantDeliveries", MerchantDeliveriesScreen],
  ["MerchantHome", MerchantHomeScreen],
  ["MerchantOrders", MerchantOrdersScreen],
  ["MerchantProducts", MerchantProductsScreen],
  ["MerchantPromotions", MerchantPromotionsScreen],
  ["MerchantSales", MerchantSalesScreen],
  ["MyAgentActivity", MyAgentActivityScreen],
  ["MyAgents", MyAgentsScreen],
  ["MyReports", MyReportsScreen],
  ["NgoApplicants", NgoApplicantsScreen],
  ["NgoAreaProjects", NgoAreaProjectsScreen],
  ["NgoBeneficiaries", NgoBeneficiariesScreen],
  ["NgoBeneficiaryForm", NgoBeneficiaryFormScreen],
  ["NgoCertificate", NgoCertificateScreen],
  ["NgoCommunities", NgoCommunitiesScreen],
  ["NgoCommunityForm", NgoCommunityFormScreen],
  ["NgoCommunity", NgoCommunityScreen],
  ["NgoDiscover", NgoDiscoverScreen],
  ["NgoExpenses", NgoExpensesScreen],
  ["NgoFinanceReport", NgoFinanceReportScreen],
  ["NgoFundingForm", NgoFundingFormScreen],
  ["NgoFunding", NgoFundingScreen],
  ["NgoHome", NgoHomeScreen],
  ["NgoMap", NgoMapScreen],
  ["NgoMonitoring", NgoMonitoringScreen],
  ["NgoMyRequests", NgoMyRequestsScreen],
  ["NgoMyTrainings", NgoMyTrainingsScreen],
  ["NgoNeedForm", NgoNeedFormScreen],
  ["NgoNeeds", NgoNeedsScreen],
  ["NgoOpportunities", NgoOpportunitiesScreen],
  ["NgoOpportunityForm", NgoOpportunityFormScreen],
  ["NgoOpportunity", NgoOpportunityScreen],
  ["NgoOrganizations", NgoOrganizationsScreen],
  ["NgoPartnerForm", NgoPartnerFormScreen],
  ["NgoPartner", NgoPartnerScreen],
  ["NgoPartners", NgoPartnersScreen],
  ["NgoProfileForm", NgoProfileFormScreen],
  ["NgoProfile", NgoProfileScreen],
  ["NgoProjectForm", NgoProjectFormScreen],
  ["NgoProject", NgoProjectScreen],
  ["NgoProjects", NgoProjectsScreen],
  ["NgoPublicOrganization", NgoPublicOrganizationScreen],
  ["NgoPublicProject", NgoPublicProjectScreen],
  ["NgoPublicationForm", NgoPublicationFormScreen],
  ["NgoPublication", NgoPublicationScreen],
  ["NgoPublications", NgoPublicationsScreen],
  ["NgoReport", NgoReportScreen],
  ["NgoRequestForm", NgoRequestFormScreen],
  ["NgoRequests", NgoRequestsScreen],
  ["NgoTrainingBrowse", NgoTrainingBrowseScreen],
  ["NgoTrainingForm", NgoTrainingFormScreen],
  ["NgoTrainingPublic", NgoTrainingPublicScreen],
  ["NgoTraining", NgoTrainingScreen],
  ["NgoVerification", NgoVerificationScreen],
  ["NgoVerificationsAdmin", NgoVerificationsAdminScreen],
  ["Notifications", NotificationsScreen],
  ["PerfilVendedor", PerfilVendedorScreen],
  ["Products", ProductsScreen],
  ["ReportCreate", ReportCreateScreen],
  ["RescueSos", RescueSosScreen],
  ["Reviews", ReviewsScreen],
  ["Settings", SettingsScreen],
  ["StoreProfile", StoreProfileScreen],
  ["Support", SupportScreen],
  ["TrCombine", TrCombineScreen],
  ["TrContactHistory", TrContactHistoryScreen],
  ["TrContacts", TrContactsScreen],
  ["TrDeliveries", TrDeliveriesScreen],
  ["TrDelivery", TrDeliveryScreen],
  ["TrEarnings", TrEarningsScreen],
  ["TrEmergency", TrEmergencyScreen],
  ["TrExpenses", TrExpensesScreen],
  ["TrFinanceReport", TrFinanceReportScreen],
  ["TrHome", TrHomeScreen],
  ["TrIncident", TrIncidentScreen],
  ["TrLoads", TrLoadsScreen],
  ["TrMap", TrMapScreen],
  ["TrOfferForm", TrOfferFormScreen],
  ["TrPayments", TrPaymentsScreen],
  ["TrProfileEdit", TrProfileEditScreen],
  ["TrProfile", TrProfileScreen],
  ["TrReputation", TrReputationScreen],
  ["TrRoutePlan", TrRoutePlanScreen],
  ["TrSafety", TrSafetyScreen],
  ["TrSecurity", TrSecurityScreen],
  ["TrServiceSuggest", TrServiceSuggestScreen],
  ["TrServices", TrServicesScreen],
  ["TrSettings", TrSettingsScreen],
  ["TrTools", TrToolsScreen],
  ["TrVehicleForm", TrVehicleFormScreen],
  ["TrVehicle", TrVehicleScreen],
  ["TransportOffers", TransportOffersScreen],
  ["TransporterVerification", TransporterVerificationScreen],
  ["Verification", VerificationScreen],
  ["TransporterProfileForm", TrProfileEditScreen],
  ["NgoAdminVerifications", NgoVerificationsAdminScreen],
  ["NgoTrainings", NgoTrainingBrowseScreen],
  ["FisherTransport", FarmerTransportScreen],
  ["Weather", FarmerWeatherScreen],
  ["FisherCooperative", FarmerCooperativeScreen],
];

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={VERDE} />
      </View>
    );
  }

  return (
    <AparenciaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, ...cabecalho }}>
          {user ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Area" component={AreaScreen} />
              {TELAS.map(([nome, componente]) => (
                <Stack.Screen
                  key={nome}
                  name={nome}
                  component={componente}
                  options={({ route }: any) => ({
                    headerShown: !SEM_CABECALHO.has(nome),
                    title:
                      route.params?.userName ||
                      route.params?.title ||
                      TITULOS[nome] ||
                      titulo(nome),
                  })}
                />
              ))}
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AparenciaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background ?? "#fff",
  },
});
