import { Response } from "express";
import { AdminRequest } from "../middleware/adminGuard";
import { adminOpsCatalog } from "../lib/adminOpsCatalog";
import * as market from "../services/adminMarketService";
import * as orders from "../services/adminOrderService";
import * as disputes from "../services/adminDisputeService";
import * as transport from "../services/adminTransportService";

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

export function opsCatalog(req: AdminRequest, res: Response) {
  return res.status(200).json(adminOpsCatalog());
}

// ---------- Mercado ----------
export const products = (req: AdminRequest, res: Response) =>
  run(res, () =>
    market.listProducts({
      q: str(req.query.q),
      department: str(req.query.department),
      status: str(req.query.status),
      ownerId: str(req.query.ownerId),
      region: str(req.query.region),
      sort: str(req.query.sort),
      page: num(req.query.page),
    })
  );
export const productOne = (req: AdminRequest, res: Response) => run(res, () => market.getProduct(req.params.id), 200, 404);
export const productApprove = (req: AdminRequest, res: Response) => run(res, () => market.approveProduct(req.admin!, req.params.id, req.body?.note));
export const productBulkApprove = (req: AdminRequest, res: Response) => run(res, () => market.bulkApprove(req.admin!, req.body?.ids));
export const productReject = (req: AdminRequest, res: Response) => run(res, () => market.rejectProduct(req.admin!, req.params.id, req.body));
export const productRemove = (req: AdminRequest, res: Response) => run(res, () => market.removeProduct(req.admin!, req.params.id, req.body));
export const productRestore = (req: AdminRequest, res: Response) => run(res, () => market.restoreProduct(req.admin!, req.params.id, req.body?.note));
export const productQuality = (req: AdminRequest, res: Response) => run(res, () => market.flagQuality(req.admin!, req.params.id, req.body));
export const productFeature = (req: AdminRequest, res: Response) => run(res, () => market.featureProduct(req.admin!, req.params.id, req.body?.days));
export const productUnfeature = (req: AdminRequest, res: Response) => run(res, () => market.unfeatureProduct(req.admin!, req.params.id));
export const featured = (req: AdminRequest, res: Response) => run(res, () => market.listFeatured());
export const quality = (req: AdminRequest, res: Response) => run(res, () => market.listQuality({ flag: str(req.query.flag), page: num(req.query.page) }));
export const categories = (req: AdminRequest, res: Response) => run(res, () => market.getCategories());
export const categorySave = (req: AdminRequest, res: Response) => run(res, () => market.saveCategory(req.admin!, req.params.department, req.body));

// ---------- Encomendas ----------
export const orderList = (req: AdminRequest, res: Response) =>
  run(res, () =>
    orders.listOrders({
      group: str(req.query.group),
      q: str(req.query.q),
      buyerId: str(req.query.buyerId),
      sellerId: str(req.query.sellerId),
      region: str(req.query.region),
      from: str(req.query.from),
      to: str(req.query.to),
      minTotal: num(req.query.minTotal),
      sort: str(req.query.sort),
      page: num(req.query.page),
    })
  );
export const orderOne = (req: AdminRequest, res: Response) => run(res, () => orders.getOrder(req.params.id), 200, 404);
export const orderNote = (req: AdminRequest, res: Response) => run(res, () => orders.addNote(req.admin!, req.params.id, req.body?.message));
export const orderNotify = (req: AdminRequest, res: Response) => run(res, () => orders.notifyParties(req.admin!, req.params.id, req.body));

// ---------- Disputas ----------
export const disputeList = (req: AdminRequest, res: Response) =>
  run(res, () =>
    disputes.listDisputes(req.admin!, {
      status: str(req.query.status),
      reason: str(req.query.reason),
      assigned: str(req.query.assigned),
      q: str(req.query.q),
      page: num(req.query.page),
    })
  );
export const disputeOne = (req: AdminRequest, res: Response) => run(res, () => disputes.getDispute(req.params.id), 200, 404);
export const disputeAssign = (req: AdminRequest, res: Response) => run(res, () => disputes.assignDispute(req.admin!, req.params.id));
export const disputeNote = (req: AdminRequest, res: Response) => run(res, () => disputes.noteDispute(req.admin!, req.params.id, req.body?.message));
export const disputeMessage = (req: AdminRequest, res: Response) => run(res, () => disputes.messageDispute(req.admin!, req.params.id, req.body?.message));
export const disputeResolve = (req: AdminRequest, res: Response) => run(res, () => disputes.resolveDispute(req.admin!, req.params.id, req.body));

// ---------- Transportes ----------
export const transportOverview = (req: AdminRequest, res: Response) => run(res, () => transport.transportOverview());
export const transporters = (req: AdminRequest, res: Response) =>
  run(res, () =>
    transport.listTransporters({
      q: str(req.query.q),
      verification: str(req.query.verification),
      region: str(req.query.region),
      available: str(req.query.available),
      sort: str(req.query.sort),
      page: num(req.query.page),
    })
  );
export const transporterWarn = (req: AdminRequest, res: Response) => run(res, () => transport.warnTransporter(req.admin!, req.params.userId, req.body?.message));
export const deliveries = (req: AdminRequest, res: Response) =>
  run(res, () =>
    transport.listDeliveries({
      phase: str(req.query.phase),
      transporterId: str(req.query.transporterId),
      q: str(req.query.q),
      problems: str(req.query.problems),
      page: num(req.query.page),
    })
  );
export const deliveryOne = (req: AdminRequest, res: Response) => run(res, () => transport.getDelivery(req.params.id), 200, 404);
export const deliveryHandle = (req: AdminRequest, res: Response) => run(res, () => transport.handleProblem(req.admin!, req.params.id, req.body));
export const routesReport = (req: AdminRequest, res: Response) => run(res, () => transport.routesReport());
export const problems = (req: AdminRequest, res: Response) => run(res, () => transport.listProblems({ status: str(req.query.status), page: num(req.query.page) }));
export const complaints = (req: AdminRequest, res: Response) => run(res, () => transport.listComplaints({ status: str(req.query.status), page: num(req.query.page) }));
export const ratings = (req: AdminRequest, res: Response) => run(res, () => transport.transportRatings());
export const verification = (req: AdminRequest, res: Response) => run(res, () => transport.verificationList({ status: str(req.query.status), q: str(req.query.q) }));
export const verificationReview = (req: AdminRequest, res: Response) => run(res, () => transport.verificationReview(req.admin!, req.params.userId, req.body));
