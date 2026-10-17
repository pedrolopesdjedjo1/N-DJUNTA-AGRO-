import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listCommunities,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  listNeeds,
  createNeed,
  updateNeed,
  deleteNeed,
  listBeneficiaries,
  createBeneficiary,
  createBeneficiaries,
  updateBeneficiary,
  deleteBeneficiary,
  getSupportOverview,
  discover,
} from "../services/ngoCommunityService";
import {
  createRequest,
  myRequests,
  deleteOwnRequest,
  listRequestsForOrganization,
  updateRequest,
  requestToBeneficiary,
} from "../services/ngoRequestService";
import { listOrganizations } from "../services/ngoDirectoryService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: any): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

// ---------- Comunidades ----------
export function communities(req: AuthRequest, res: Response) {
  return run(res, () =>
    listCommunities(req.userId!, req.userRole, {
      type: str(req.query.type),
      region: str(req.query.region),
      q: str(req.query.q),
    })
  );
}

export function newCommunity(req: AuthRequest, res: Response) {
  return run(res, () => createCommunity(req.userId!, req.userRole, req.body), 201);
}

export function editCommunity(req: AuthRequest, res: Response) {
  return run(res, () => updateCommunity(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeCommunity(req: AuthRequest, res: Response) {
  return run(res, () => deleteCommunity(req.userId!, req.userRole, req.params.id));
}

// ---------- Necessidades ----------
export function needs(req: AuthRequest, res: Response) {
  return run(res, () =>
    listNeeds(req.userId!, req.userRole, {
      communityId: str(req.query.communityId),
      category: str(req.query.category),
      status: str(req.query.status),
      priority: str(req.query.priority),
      region: str(req.query.region),
    })
  );
}

export function newNeed(req: AuthRequest, res: Response) {
  return run(res, () => createNeed(req.userId!, req.userRole, req.body), 201);
}

export function editNeed(req: AuthRequest, res: Response) {
  return run(res, () => updateNeed(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeNeed(req: AuthRequest, res: Response) {
  return run(res, () => deleteNeed(req.userId!, req.userRole, req.params.id));
}

// ---------- Beneficiários ----------
export function beneficiaries(req: AuthRequest, res: Response) {
  return run(res, () =>
    listBeneficiaries(req.userId!, req.userRole, {
      projectId: str(req.query.projectId),
      communityId: str(req.query.communityId),
      sector: str(req.query.sector),
      gender: str(req.query.gender),
      youth: req.query.youth === "true",
      linked: req.query.linked === "true",
      q: str(req.query.q),
      page: num(req.query.page),
      limit: num(req.query.limit),
    })
  );
}

export function newBeneficiary(req: AuthRequest, res: Response) {
  return run(res, () => createBeneficiary(req.userId!, req.userRole, req.body), 201);
}

export function bulkBeneficiaries(req: AuthRequest, res: Response) {
  return run(res, () => createBeneficiaries(req.userId!, req.userRole, req.body), 201);
}

export function editBeneficiary(req: AuthRequest, res: Response) {
  return run(res, () => updateBeneficiary(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeBeneficiary(req: AuthRequest, res: Response) {
  return run(res, () => deleteBeneficiary(req.userId!, req.userRole, req.params.id));
}

export function overview(req: AuthRequest, res: Response) {
  return run(res, () => getSupportOverview(req.userId!, req.userRole));
}

export function discoverPeople(req: AuthRequest, res: Response) {
  return run(res, () =>
    discover(req.userId!, req.userRole, {
      kind: str(req.query.kind),
      region: str(req.query.region),
      q: str(req.query.q),
      page: num(req.query.page),
    })
  );
}

// ---------- Organizações (público) ----------
export function organizations(req: AuthRequest, res: Response) {
  return run(res, () =>
    listOrganizations({
      q: str(req.query.q),
      region: str(req.query.region),
      area: str(req.query.area),
      verifiedOnly: req.query.verified === "true",
    })
  );
}

// ---------- Pedidos de apoio ----------
export function newRequest(req: AuthRequest, res: Response) {
  return run(res, () => createRequest(req.userId!, req.body), 201);
}

export function myOwnRequests(req: AuthRequest, res: Response) {
  return run(res, () => myRequests(req.userId!));
}

export function removeOwnRequest(req: AuthRequest, res: Response) {
  return run(res, () => deleteOwnRequest(req.userId!, req.params.id));
}

export function requests(req: AuthRequest, res: Response) {
  return run(res, () =>
    listRequestsForOrganization(req.userId!, req.userRole, { scope: str(req.query.scope), status: str(req.query.status) })
  );
}

export function answerRequest(req: AuthRequest, res: Response) {
  return run(res, () => updateRequest(req.userId!, req.userRole, req.params.id, req.body));
}

export function toBeneficiary(req: AuthRequest, res: Response) {
  return run(res, () => requestToBeneficiary(req.userId!, req.userRole, req.params.id, req.body), 201);
}
