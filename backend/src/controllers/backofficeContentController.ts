import { Response } from "express";
import { AdminRequest } from "../middleware/adminGuard";
import { adminContentCatalog } from "../lib/adminContentCatalog";
import * as broadcast from "../services/adminBroadcastService";
import * as content from "../services/adminContentService";
import * as support from "../services/adminSupportService";
import * as stats from "../services/adminStatsService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

export const contentCatalog = (req: AdminRequest, res: Response) => res.status(200).json(adminContentCatalog());

// ---------- Avisos e alertas ----------
export const broadcastPreview = (req: AdminRequest, res: Response) => run(res, () => broadcast.previewBroadcast(req.admin!, req.body));
export const broadcastSend = (req: AdminRequest, res: Response) => run(res, () => broadcast.sendBroadcast(req.admin!, req.body), 201);
export const broadcastList = (req: AdminRequest, res: Response) =>
  run(res, () => broadcast.listBroadcasts({ kind: str(req.query.kind), alerts: str(req.query.alerts), status: str(req.query.status), page: num(req.query.page) }));
export const alertsOverview = (req: AdminRequest, res: Response) =>
  run(res, () => broadcast.alertsOverview({ status: str(req.query.status), type: str(req.query.type), kind: str(req.query.kind) }));
export const alertEnd = (req: AdminRequest, res: Response) => run(res, () => broadcast.endAlert(req.admin!, req.params.id, req.body));
export const alertEndOfficial = (req: AdminRequest, res: Response) => run(res, () => broadcast.endOfficialAlert(req.admin!, req.params.id));

// ---------- Banners e destaques ----------
export const bannerList = (req: AdminRequest, res: Response) => run(res, () => content.listBanners({ status: str(req.query.status) }));
export const bannerCreate = (req: AdminRequest, res: Response) => run(res, () => content.saveBanner(req.admin!, null, req.body), 201);
export const bannerUpdate = (req: AdminRequest, res: Response) => run(res, () => content.saveBanner(req.admin!, req.params.id, req.body));
export const bannerDelete = (req: AdminRequest, res: Response) => run(res, () => content.deleteBanner(req.admin!, req.params.id));
export const highlightList = (req: AdminRequest, res: Response) => run(res, () => content.listHighlights(str(req.query.kind)));
export const highlightSave = (req: AdminRequest, res: Response) => run(res, () => content.saveHighlight(req.admin!, req.body), 201);
export const highlightRemove = (req: AdminRequest, res: Response) => run(res, () => content.removeHighlight(req.admin!, req.params.id));

// ---------- Conteúdos ----------
export const contentList = (req: AdminRequest, res: Response) => run(res, () => content.listContent(req.params.kind, { q: str(req.query.q), status: str(req.query.status), page: num(req.query.page) }));
export const contentHide = (req: AdminRequest, res: Response) => run(res, () => content.setHidden(req.admin!, req.body, true));
export const contentRestore = (req: AdminRequest, res: Response) => run(res, () => content.setHidden(req.admin!, req.body, false));

// ---------- Eventos ----------
export const eventList = (req: AdminRequest, res: Response) =>
  run(res, () => content.listEvents({ group: str(req.query.group), when: str(req.query.when), status: str(req.query.status), q: str(req.query.q), page: num(req.query.page) }));
export const eventOne = (req: AdminRequest, res: Response) => run(res, () => content.getEvent(req.params.id), 200, 404);
export const eventCancel = (req: AdminRequest, res: Response) => run(res, () => content.cancelEvent(req.admin!, req.params.id, req.body?.reason));
export const eventRestore = (req: AdminRequest, res: Response) => run(res, () => content.restoreEvent(req.admin!, req.params.id, req.body?.reason));
export const eventNotify = (req: AdminRequest, res: Response) => run(res, () => content.notifyEventParticipants(req.admin!, req.params.id, req.body?.message));

// ---------- Suporte ----------
export const ticketList = (req: AdminRequest, res: Response) =>
  run(res, () => support.listTickets(req.admin!, { status: str(req.query.status), category: str(req.query.category), assigned: str(req.query.assigned), q: str(req.query.q), page: num(req.query.page) }));
export const ticketOne = (req: AdminRequest, res: Response) => run(res, () => support.getTicket(req.params.id), 200, 404);
export const ticketReply = (req: AdminRequest, res: Response) => run(res, () => support.replyTicket(req.admin!, req.params.id, req.body));
export const ticketNote = (req: AdminRequest, res: Response) => run(res, () => support.noteTicket(req.admin!, req.params.id, req.body?.message));
export const ticketStatus = (req: AdminRequest, res: Response) => run(res, () => support.statusTicket(req.admin!, req.params.id, req.body?.status));
export const ticketAssign = (req: AdminRequest, res: Response) => run(res, () => support.assignTicket(req.admin!, req.params.id));
export const supportStats = (req: AdminRequest, res: Response) => run(res, () => support.supportStats());
export const supportContacts = (req: AdminRequest, res: Response) => run(res, () => support.officialContacts());

// ---------- Relatórios e estatísticas ----------
export const statsOverview = (req: AdminRequest, res: Response) => run(res, () => stats.statsOverview({ from: str(req.query.from), to: str(req.query.to) }));
export const statsGrowth = (req: AdminRequest, res: Response) => run(res, () => stats.statsGrowth({ from: str(req.query.from), to: str(req.query.to) }));
export const statsRegions = (req: AdminRequest, res: Response) => run(res, () => stats.statsRegions({ from: str(req.query.from), to: str(req.query.to) }));
export const statsSegment = (req: AdminRequest, res: Response) => run(res, () => stats.statsSegment(req.params.kind, { from: str(req.query.from), to: str(req.query.to) }));
export const statsReport = (req: AdminRequest, res: Response) => run(res, () => stats.statsReport({ from: str(req.query.from), to: str(req.query.to) }));
