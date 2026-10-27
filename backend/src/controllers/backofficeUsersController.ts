import { Response } from "express";
import { AdminRequest } from "../middleware/adminGuard";
import { adminUsersCatalog } from "../lib/adminUserCatalog";
import { getDashboard } from "../services/adminDashboardService";
import { listUsers, getUser, editUser, setVerified, profileSummary, listProfiles } from "../services/adminUserService";
import { suspendUser, blockUser, reactivateUser } from "../services/adminSanctionService";
import { listIdentity, getIdentity, reviewIdentity } from "../services/adminIdentityService";
import { listReports, getReport, assignReport, noteReport, decideReport } from "../services/adminReportService";

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

export function usersCatalog(req: AdminRequest, res: Response) {
  return res.status(200).json(adminUsersCatalog());
}

export function dashboard(req: AdminRequest, res: Response) {
  return run(res, () => getDashboard(req.admin!));
}

// ---------- Utilizadores ----------
export function users(req: AdminRequest, res: Response) {
  return run(res, () =>
    listUsers({
      q: str(req.query.q),
      role: str(req.query.role),
      status: str(req.query.status),
      verified: str(req.query.verified),
      region: str(req.query.region),
      from: str(req.query.from),
      to: str(req.query.to),
      sort: str(req.query.sort),
      page: num(req.query.page),
    })
  );
}

export function userOne(req: AdminRequest, res: Response) {
  return run(res, () => getUser(req.params.id), 200, 404);
}

export function userEdit(req: AdminRequest, res: Response) {
  return run(res, () => editUser(req.admin!, req.params.id, req.body));
}

export function userSuspend(req: AdminRequest, res: Response) {
  return run(res, async () => {
    await suspendUser(req.admin!, req.params.id, req.body);
    return getUser(req.params.id);
  });
}

export function userBlock(req: AdminRequest, res: Response) {
  return run(res, async () => {
    await blockUser(req.admin!, req.params.id, req.body);
    return getUser(req.params.id);
  });
}

export function userReactivate(req: AdminRequest, res: Response) {
  return run(res, async () => {
    await reactivateUser(req.admin!, req.params.id, req.body);
    return getUser(req.params.id);
  });
}

export function userVerify(req: AdminRequest, res: Response) {
  return run(res, () => setVerified(req.admin!, req.params.id, true, req.body?.note));
}

export function userUnverify(req: AdminRequest, res: Response) {
  return run(res, () => setVerified(req.admin!, req.params.id, false, req.body?.note));
}

// ---------- Perfis ----------
export function profilesSummary(req: AdminRequest, res: Response) {
  return run(res, () => profileSummary());
}

export function profiles(req: AdminRequest, res: Response) {
  return run(res, () => listProfiles(req.params.kind, { q: str(req.query.q), verified: str(req.query.verified), page: num(req.query.page) }));
}

// ---------- Verificação de identidade ----------
export function identityList(req: AdminRequest, res: Response) {
  return run(res, () => listIdentity({ status: str(req.query.status), q: str(req.query.q), page: num(req.query.page) }));
}

export function identityOne(req: AdminRequest, res: Response) {
  return run(res, () => getIdentity(req.params.id), 200, 404);
}

export function identityReview(req: AdminRequest, res: Response) {
  return run(res, () => reviewIdentity(req.admin!, req.params.id, req.body));
}

// ---------- Denúncias ----------
export function reports(req: AdminRequest, res: Response) {
  return run(res, () =>
    listReports(req.admin!, {
      status: str(req.query.status),
      targetType: str(req.query.targetType),
      category: str(req.query.category),
      assigned: str(req.query.assigned),
      q: str(req.query.q),
      page: num(req.query.page),
    })
  );
}

export function reportOne(req: AdminRequest, res: Response) {
  return run(res, () => getReport(req.params.id), 200, 404);
}

export function reportAssign(req: AdminRequest, res: Response) {
  return run(res, () => assignReport(req.admin!, req.params.id));
}

export function reportNote(req: AdminRequest, res: Response) {
  return run(res, () => noteReport(req.admin!, req.params.id, req.body?.message));
}

export function reportDecide(req: AdminRequest, res: Response) {
  return run(res, () => decideReport(req.admin!, req.params.id, req.body));
}
