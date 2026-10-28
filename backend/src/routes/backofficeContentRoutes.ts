import { Router } from "express";
import { requirePermission } from "../middleware/adminGuard";
import * as c from "../controllers/backofficeContentController";

// A autenticação e o adminContext entram no server.ts, antes destas rotas
const router = Router();

router.get("/catalog/content", c.contentCatalog);

// Avisos e alertas (a permissão certa de cada tipo é confirmada dentro do serviço)
router.post("/broadcasts/preview", requirePermission("notify.send", "alerts.manage"), c.broadcastPreview);
router.post("/broadcasts", requirePermission("notify.send", "alerts.manage"), c.broadcastSend);
router.get("/broadcasts", requirePermission("notify.send", "alerts.manage"), c.broadcastList);
router.get("/alerts", requirePermission("alerts.manage", "notify.send", "gov.view"), c.alertsOverview);
router.post("/alerts/official/:id/end", requirePermission("alerts.manage"), c.alertEndOfficial);
router.post("/alerts/:id/end", requirePermission("alerts.manage"), c.alertEnd);

// Banners e destaques
router.get("/banners", requirePermission("content.manage"), c.bannerList);
router.post("/banners", requirePermission("content.manage"), c.bannerCreate);
router.put("/banners/:id", requirePermission("content.manage"), c.bannerUpdate);
router.delete("/banners/:id", requirePermission("content.manage"), c.bannerDelete);
router.get("/highlights", requirePermission("content.manage", "events.manage"), c.highlightList);
router.post("/highlights", requirePermission("content.manage", "events.manage"), c.highlightSave);
router.delete("/highlights/:id", requirePermission("content.manage", "events.manage"), c.highlightRemove);

// Conteúdos: listar, esconder e repor
router.get("/content/list/:kind", requirePermission("content.manage", "events.manage", "orgs.manage"), c.contentList);
router.post("/content/visibility/hide", requirePermission("content.manage", "events.manage", "orgs.manage"), c.contentHide);
router.post("/content/visibility/restore", requirePermission("content.manage", "events.manage", "orgs.manage"), c.contentRestore);

// Eventos
router.get("/events", requirePermission("events.manage", "content.manage"), c.eventList);
router.get("/events/:id", requirePermission("events.manage", "content.manage"), c.eventOne);
router.post("/events/:id/cancel", requirePermission("events.manage"), c.eventCancel);
router.post("/events/:id/restore", requirePermission("events.manage"), c.eventRestore);
router.post("/events/:id/notify", requirePermission("events.manage"), c.eventNotify);

// Suporte (rotas fixas primeiro, antes de /:id)
router.get("/support/stats", requirePermission("support.view"), c.supportStats);
router.get("/support/contacts", requirePermission("support.view"), c.supportContacts);
router.get("/support/tickets", requirePermission("support.view"), c.ticketList);
router.get("/support/tickets/:id", requirePermission("support.view"), c.ticketOne);
router.post("/support/tickets/:id/reply", requirePermission("support.reply"), c.ticketReply);
router.post("/support/tickets/:id/note", requirePermission("support.reply"), c.ticketNote);
router.post("/support/tickets/:id/status", requirePermission("support.reply"), c.ticketStatus);
router.post("/support/tickets/:id/assign", requirePermission("support.reply"), c.ticketAssign);

// Relatórios e estatísticas
router.get("/stats/overview", requirePermission("stats.view"), c.statsOverview);
router.get("/stats/growth", requirePermission("stats.view"), c.statsGrowth);
router.get("/stats/regions", requirePermission("stats.view"), c.statsRegions);
router.get("/stats/segment/:kind", requirePermission("stats.view"), c.statsSegment);
router.get("/stats/report", requirePermission("stats.view"), c.statsReport);

export default router;
