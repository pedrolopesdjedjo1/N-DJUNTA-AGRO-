import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { agentOpsCatalog } from "../lib/agentOpsCatalog";
import { listProducts, getProduct, clientProducts, suggestProduct } from "../services/agentMarketService";
import { listOrders, getOrder, logOrderAction } from "../services/agentOrderService";
import { listTransporters, listDeliveries, getDelivery } from "../services/agentTransportService";
import {
  listCases,
  createCase,
  getCase,
  addCaseNote,
  setCaseStatus,
  escalateCase,
  deleteCase,
  adminListCases,
  adminGetCase,
  adminRespondCase,
} from "../services/agentCaseService";

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

export function opsCatalog(req: AuthRequest, res: Response) {
  return res.status(200).json(agentOpsCatalog());
}

// ---------- Mercado ----------
export function market(req: AuthRequest, res: Response) {
  return run(res, () =>
    listProducts(req.userId!, req.userRole, {
      q: str(req.query.q),
      department: str(req.query.department),
      subcategory: str(req.query.subcategory),
      region: str(req.query.region),
      minPrice: num(req.query.minPrice),
      maxPrice: num(req.query.maxPrice),
      sort: str(req.query.sort),
      scope: str(req.query.scope),
      availability: str(req.query.availability),
      page: num(req.query.page),
    })
  );
}

export function marketOne(req: AuthRequest, res: Response) {
  return run(res, () => getProduct(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function marketClient(req: AuthRequest, res: Response) {
  return run(res, () => clientProducts(req.userId!, req.userRole, req.params.linkId), 200, 404);
}

export function marketSuggest(req: AuthRequest, res: Response) {
  return run(res, () => suggestProduct(req.userId!, req.userRole, req.body), 201);
}

// ---------- Encomendas ----------
export function orders(req: AuthRequest, res: Response) {
  return run(res, () =>
    listOrders(req.userId!, req.userRole, {
      scope: str(req.query.scope),
      stage: str(req.query.stage),
      side: str(req.query.side),
      linkId: str(req.query.linkId),
      q: str(req.query.q),
      attention: req.query.attention === "true",
      page: num(req.query.page),
    })
  );
}

export function orderOne(req: AuthRequest, res: Response) {
  return run(res, () => getOrder(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function orderLog(req: AuthRequest, res: Response) {
  return run(res, () => logOrderAction(req.userId!, req.userRole, req.params.id, req.body), 201);
}

// ---------- Transporte ----------
export function transporters(req: AuthRequest, res: Response) {
  return run(res, () =>
    listTransporters(req.userId!, req.userRole, {
      region: str(req.query.region),
      q: str(req.query.q),
      scope: str(req.query.scope),
      page: num(req.query.page),
    })
  );
}

export function deliveries(req: AuthRequest, res: Response) {
  return run(res, () =>
    listDeliveries(req.userId!, req.userRole, {
      status: str(req.query.status),
      linkId: str(req.query.linkId),
      attention: req.query.attention === "true",
    })
  );
}

export function deliveryOne(req: AuthRequest, res: Response) {
  return run(res, () => getDelivery(req.userId!, req.userRole, req.params.id), 200, 404);
}

// ---------- Chamados ----------
export function cases(req: AuthRequest, res: Response) {
  return run(res, () =>
    listCases(req.userId!, req.userRole, {
      status: str(req.query.status),
      category: str(req.query.category),
      linkId: str(req.query.linkId),
      orderId: str(req.query.orderId),
      q: str(req.query.q),
    })
  );
}

export function caseCreate(req: AuthRequest, res: Response) {
  return run(res, () => createCase(req.userId!, req.userRole, req.body), 201);
}

export function caseOne(req: AuthRequest, res: Response) {
  return run(res, () => getCase(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function caseNote(req: AuthRequest, res: Response) {
  return run(res, () => addCaseNote(req.userId!, req.userRole, req.params.id, req.body?.message), 201);
}

export function caseStatus(req: AuthRequest, res: Response) {
  return run(res, () => setCaseStatus(req.userId!, req.userRole, req.params.id, req.body));
}

export function caseEscalate(req: AuthRequest, res: Response) {
  return run(res, () => escalateCase(req.userId!, req.userRole, req.params.id, req.body?.message));
}

export function caseRemove(req: AuthRequest, res: Response) {
  return run(res, () => deleteCase(req.userId!, req.userRole, req.params.id));
}

// ---------- Equipa do app ----------
export function adminCases(req: AuthRequest, res: Response) {
  return run(res, () => adminListCases(req.userRole, { status: str(req.query.status) }));
}

export function adminCaseOne(req: AuthRequest, res: Response) {
  return run(res, () => adminGetCase(req.userRole, req.params.id), 200, 404);
}

export function adminCaseRespond(req: AuthRequest, res: Response) {
  return run(res, () => adminRespondCase(req.userRole, req.userId!, req.params.id, req.body), 201);
}
