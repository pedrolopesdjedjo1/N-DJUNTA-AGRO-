import { Response } from "express";
import { AdminRequest } from "../middleware/adminGuard";
import { adminOrgsCatalog } from "../lib/adminFinanceCatalog";
import * as coops from "../services/adminCoopService";
import * as orgs from "../services/adminOrgService";
import * as gov from "../services/adminGovService";

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

export const orgsCatalog = (req: AdminRequest, res: Response) => res.status(200).json(adminOrgsCatalog());

// ---------- Cooperativas ----------
export const coopList = (req: AdminRequest, res: Response) =>
  run(res, () => coops.listCooperatives({ status: str(req.query.status), region: str(req.query.region), q: str(req.query.q), page: num(req.query.page) }));
export const coopOne = (req: AdminRequest, res: Response) => run(res, () => coops.getCooperative(req.params.id), 200, 404);
export const coopEdit = (req: AdminRequest, res: Response) => run(res, () => coops.editCooperative(req.admin!, req.params.id, req.body));
export const coopReview = (req: AdminRequest, res: Response) => run(res, () => coops.reviewCooperative(req.admin!, req.params.id, req.body));

// ---------- ONGs e instituições ----------
export const orgList = (req: AdminRequest, res: Response) =>
  run(res, () => orgs.listOrganizations({ kind: str(req.query.kind), status: str(req.query.status), q: str(req.query.q), page: num(req.query.page) }));
export const orgOne = (req: AdminRequest, res: Response) => run(res, () => orgs.getOrganization(req.params.userId), 200, 404);
export const orgSuspend = (req: AdminRequest, res: Response) => run(res, () => orgs.suspendOrganization(req.admin!, req.params.userId, req.body));
export const orgReactivate = (req: AdminRequest, res: Response) => run(res, () => orgs.reactivateOrganization(req.admin!, req.params.userId, req.body));
export const orgNotify = (req: AdminRequest, res: Response) => run(res, () => orgs.notifyOrganization(req.admin!, req.params.userId, req.body?.message));
export const contentHide = (req: AdminRequest, res: Response) => run(res, () => orgs.setContentHidden(req.admin!, req.body, true));
export const contentRestore = (req: AdminRequest, res: Response) => run(res, () => orgs.setContentHidden(req.admin!, req.body, false));

// ---------- Governo ----------
export const govOverview = (req: AdminRequest, res: Response) => run(res, () => gov.govOverview());
export const govPrograms = (req: AdminRequest, res: Response) => run(res, () => gov.listPrograms({ q: str(req.query.q), page: num(req.query.page) }));
export const govServices = (req: AdminRequest, res: Response) =>
  run(res, () => gov.listServices({ published: str(req.query.published), q: str(req.query.q), region: str(req.query.region), page: num(req.query.page) }));
export const govServicePublished = (req: AdminRequest, res: Response) =>
  run(res, () => gov.setServicePublished(req.admin!, req.params.id, req.body?.published === true, req.body?.note));
export const govPublications = (req: AdminRequest, res: Response) =>
  run(res, () => gov.listGovPublications({ kind: str(req.query.kind), q: str(req.query.q), page: num(req.query.page) }));
export const govRequests = (req: AdminRequest, res: Response) =>
  run(res, () => gov.listCommunityRequests({ status: str(req.query.status), stuck: str(req.query.stuck), region: str(req.query.region), q: str(req.query.q), page: num(req.query.page) }));
