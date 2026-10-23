import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { agentCatalog } from "../lib/agentCatalog";
import {
  getMyProfile,
  saveProfile,
  addDocument,
  deleteDocument,
  submitForApproval,
  getPublicAgent,
  listAgentsAdmin,
  reviewAgent,
} from "../services/agentService";
import {
  linkRegisteredClient,
  inviteExistingUser,
  listClients,
  getClient,
  updateNotes,
  removeClient,
  addActivity,
  listActivities,
  myAgents,
  respondInvite,
  revokeAgent,
  myAgentActivity,
  rateAgent,
} from "../services/agentClientService";
import { startAssist, renewAssist, endAssist, listSessions } from "../services/agentAssistService";

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

export function catalog(req: AuthRequest, res: Response) {
  return res.status(200).json(agentCatalog());
}

// ---------- O meu perfil ----------
export function me(req: AuthRequest, res: Response) {
  return run(res, () => getMyProfile(req.userId!, req.userRole));
}

export function saveMe(req: AuthRequest, res: Response) {
  return run(res, () => saveProfile(req.userId!, req.userRole, req.body));
}

export function addDoc(req: AuthRequest, res: Response) {
  return run(res, () => addDocument(req.userId!, req.userRole, req.body), 201);
}

export function removeDoc(req: AuthRequest, res: Response) {
  return run(res, () => deleteDocument(req.userId!, req.userRole, req.params.id));
}

export function submit(req: AuthRequest, res: Response) {
  return run(res, () => submitForApproval(req.userId!, req.userRole));
}

export function publicAgent(req: AuthRequest, res: Response) {
  return run(res, () => getPublicAgent(req.userId!, req.userRole, req.params.id), 200, 404);
}

// ---------- Equipa do app ----------
export function adminAgents(req: AuthRequest, res: Response) {
  return run(res, () => listAgentsAdmin(req.userRole, { status: str(req.query.status), q: str(req.query.q) }));
}

export function adminReview(req: AuthRequest, res: Response) {
  return run(res, () => reviewAgent(req.userRole, req.userId!, req.params.userId, req.body));
}

// ---------- Clientes ----------
export function clients(req: AuthRequest, res: Response) {
  return run(res, () =>
    listClients(req.userId!, req.userRole, {
      status: str(req.query.status),
      kind: str(req.query.kind),
      q: str(req.query.q),
      region: str(req.query.region),
    })
  );
}

export function registerLink(req: AuthRequest, res: Response) {
  return run(res, () => linkRegisteredClient(req.userId!, req.userRole, req.body), 201);
}

export function invite(req: AuthRequest, res: Response) {
  return run(res, () => inviteExistingUser(req.userId!, req.userRole, req.body), 201);
}

export function clientOne(req: AuthRequest, res: Response) {
  return run(res, () => getClient(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function clientNotes(req: AuthRequest, res: Response) {
  return run(res, () => updateNotes(req.userId!, req.userRole, req.params.id, req.body?.notes));
}

export function clientRemove(req: AuthRequest, res: Response) {
  return run(res, () => removeClient(req.userId!, req.userRole, req.params.id));
}

export function clientActivityAdd(req: AuthRequest, res: Response) {
  return run(res, () => addActivity(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function activities(req: AuthRequest, res: Response) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  return run(res, () =>
    listActivities(req.userId!, req.userRole, {
      linkId: str(req.query.linkId),
      kind: str(req.query.kind),
      limit: limit && !isNaN(limit) ? limit : undefined,
    })
  );
}

// ---------- Sessões de ajuda ----------
export function assistStart(req: AuthRequest, res: Response) {
  return run(res, () => startAssist(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function assistRenew(req: AuthRequest, res: Response) {
  return run(res, () => renewAssist(req.userId!, req.userRole, req.params.sessionId));
}

export function assistEnd(req: AuthRequest, res: Response) {
  return run(res, () => endAssist(req.userId!, req.userRole, req.params.sessionId));
}

export function assistSessions(req: AuthRequest, res: Response) {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  return run(res, () =>
    listSessions(req.userId!, req.userRole, { linkId: str(req.query.linkId), limit: limit && !isNaN(limit) ? limit : undefined })
  );
}

// ---------- Do lado da pessoa ajudada ----------
export function mine(req: AuthRequest, res: Response) {
  return run(res, () => myAgents(req.userId!));
}

export function respond(req: AuthRequest, res: Response) {
  return run(res, () => respondInvite(req.userId!, req.params.linkId, req.body?.accept === true));
}

export function revoke(req: AuthRequest, res: Response) {
  return run(res, () => revokeAgent(req.userId!, req.params.linkId));
}

export function mineActivity(req: AuthRequest, res: Response) {
  return run(res, () => myAgentActivity(req.userId!, req.params.linkId), 200, 404);
}

export function rate(req: AuthRequest, res: Response) {
  return run(res, () => rateAgent(req.userId!, req.params.linkId, req.body));
}
