// Carrega o .env antes de qualquer outro ficheiro ler variáveis (JWT, base de dados...)
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";

// Guardas (ordem importa: conta suspensa -> sessão de ajuda do agente -> rotas)
import { accountGuard } from "./middleware/accountGuard";
import { assistGuard } from "./middleware/assistGuard";
import { authMiddleware } from "./middleware/auth";
import { adminContext } from "./middleware/adminGuard";
import { authLimiter } from "./middleware/rateLimit";

// Base comum
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import messageRoutes from "./routes/messageRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import translationRoutes from "./routes/translationRoutes";
import smsRoutes from "./routes/smsRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import supportRoutes from "./routes/supportRoutes";
import contactRoutes from "./routes/contactRoutes";
import priceRoutes from "./routes/priceRoutes";
import weatherRoutes from "./routes/weatherRoutes";
import seaRoutes from "./routes/seaRoutes";
import sosRoutes from "./routes/sosRoutes";
import trackingRoutes from "./routes/trackingRoutes";
import eventRoutes from "./routes/eventRoutes";
import learningRoutes from "./routes/learningRoutes";
import communityRoutes from "./routes/communityRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import cooperativeRoutes from "./routes/cooperativeRoutes";

// Perfis
import farmerRoutes from "./routes/farmerRoutes";
import fisherRoutes from "./routes/fisherRoutes";
import artisanRoutes from "./routes/artisanRoutes";
import merchantRoutes from "./routes/merchantRoutes";
import clientRoutes from "./routes/clientRoutes";
import clientExtrasRoutes from "./routes/clientExtrasRoutes";
import clientOrderRoutes from "./routes/clientOrderRoutes";
import cartRoutes from "./routes/cartRoutes";
import orderRoutes from "./routes/orderRoutes";

// ONG
import ngoRoutes from "./routes/ngoRoutes";
import ngoCommunityRoutes from "./routes/ngoCommunityRoutes";
import ngoFinanceRoutes from "./routes/ngoFinanceRoutes";
import ngoMonitorRoutes from "./routes/ngoMonitorRoutes";
import trainingRoutes from "./routes/trainingRoutes";
import opportunityRoutes from "./routes/opportunityRoutes";
import publicationRoutes from "./routes/publicationRoutes";

// Governo
import govRoutes from "./routes/govRoutes";
import govAlertRoutes from "./routes/govAlertRoutes";
import govMonitorRoutes from "./routes/govMonitorRoutes";
import govPublicRoutes from "./routes/govPublicRoutes";
import govReportRoutes from "./routes/govReportRoutes";

// Agente
import agentRoutes from "./routes/agentRoutes";
import agentFinanceRoutes from "./routes/agentFinanceRoutes";
import agentOpsRoutes from "./routes/agentOpsRoutes";
import agentWorkRoutes from "./routes/agentWorkRoutes";

// Transportador
import transporterRoutes from "./routes/transporterRoutes";
import transporterExtraRoutes from "./routes/transporterExtraRoutes";
import transporterV2Routes from "./routes/transporterV2Routes";
import transporterBusinessRoutes from "./routes/transporterBusinessRoutes";
import transporterToolsRoutes from "./routes/transporterToolsRoutes";
import { startTransportNotifier } from "./services/transportNotifier";

// Plataforma (para todos os perfis)
import platformRoutes from "./routes/platformRoutes";
import platformOpsRoutes from "./routes/platformOpsRoutes";
import platformContentRoutes from "./routes/platformContentRoutes";
import platformFeedRoutes from "./routes/platformFeedRoutes";
import platformTransportRoutes from "./routes/platformTransportRoutes";
import platformOffersRoutes from "./routes/platformOffersRoutes";
import platformDevicesRoutes from "./routes/platformDevicesRoutes";

// Administradores e Super Administrador (backoffice)
import backofficeCoreRoutes from "./routes/backofficeCoreRoutes";
import backofficeUsersRoutes from "./routes/backofficeUsersRoutes";
import backofficeOpsRoutes from "./routes/backofficeOpsRoutes";
import backofficeFinanceRoutes from "./routes/backofficeFinanceRoutes";
import backofficeOrgsRoutes from "./routes/backofficeOrgsRoutes";
import backofficeContentRoutes from "./routes/backofficeContentRoutes";
import backofficeTransportRoutes from "./routes/backofficeTransportRoutes";

// Ferramentas gerais e conteúdo (usadas por Ferramentas / Publicar conteúdo)
import comunsRoutes from "./routes/comunsRoutes";
import conteudoRoutes from "./routes/conteudoRoutes";

const app = express();

// O Render fica à frente do servidor: precisamos disto para ver o IP real
app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));

// Conta suspensa ou bloqueada deixa de usar o app; depois a sessão de ajuda do agente
app.use(accountGuard);
app.use(assistGuard);

// ---------- Base comum ----------
// Login e registo com limite de tentativas por IP
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/sea", seaRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/cooperatives", cooperativeRoutes);

// ---------- Perfis ----------
app.use("/api/farmer", farmerRoutes);
app.use("/api/fisher", fisherRoutes);
app.use("/api/artisan", artisanRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/client", clientRoutes, clientExtrasRoutes, clientOrderRoutes, cartRoutes);
app.use("/api/orders", orderRoutes);

// ---------- ONG ----------
app.use("/api/ngo", ngoRoutes, ngoCommunityRoutes, ngoFinanceRoutes, ngoMonitorRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/publications", publicationRoutes);

// ---------- Governo ----------
app.use("/api/gov", govRoutes, govAlertRoutes, govMonitorRoutes, govPublicRoutes, govReportRoutes);

// ---------- Agente ----------
app.use("/api/agent", agentRoutes, agentFinanceRoutes, agentOpsRoutes, agentWorkRoutes);

// ---------- Transportador ----------
app.use(
  "/api/transporter",
  transporterRoutes,
  transporterExtraRoutes,
  transporterV2Routes,
  transporterBusinessRoutes,
  transporterToolsRoutes
);

// ---------- Plataforma (todos os perfis) ----------
app.use(
  "/api/platform",
  authMiddleware,
  platformRoutes,
  platformOpsRoutes,
  platformContentRoutes,
  platformFeedRoutes,
  platformTransportRoutes,
  platformOffersRoutes,
  platformDevicesRoutes
);

// ---------- Backoffice (Administrador e Super Administrador) ----------
app.use(
  "/api/backoffice",
  authMiddleware,
  adminContext,
  backofficeCoreRoutes,
  backofficeUsersRoutes,
  backofficeOpsRoutes,
  backofficeFinanceRoutes,
  backofficeOrgsRoutes,
  backofficeContentRoutes,
  backofficeTransportRoutes
);

// ---------- Ferramentas gerais e conteúdo ----------
app.use("/api/comuns", comunsRoutes);
app.use("/api/conteudo", conteudoRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "NôdjuntaAgro GB API rodando" });
});

// Para o Render e para testes rápidos
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  // JSON inválido enviado pelo cliente não é erro do servidor
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Dados inválidos." });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Pedido demasiado grande." });
  }
  console.error("server error", error);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  startTransportNotifier();
});
