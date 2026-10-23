import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getHome } from "../services/agentHomeService";
import { listTasks, createTask, updateTask, setTaskStatus, deleteTask } from "../services/agentTaskService";
import { listNeeds, createNeed, updateNeed, setNeedServed, forwardNeed, deleteNeed } from "../services/agentNeedService";
import { listProducers, inviteFromDirectory, listCooperatives, getCommunities } from "../services/agentCommunityService";
import { listOpportunitiesForAgent, refer, listReferrals } from "../services/agentReferralService";

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

export function home(req: AuthRequest, res: Response) {
  return run(res, () => getHome(req.userId!, req.userRole));
}

// ---------- Tarefas ----------
export function tasks(req: AuthRequest, res: Response) {
  return run(res, () =>
    listTasks(req.userId!, req.userRole, {
      status: str(req.query.status),
      linkId: str(req.query.linkId),
      when: str(req.query.when),
      kind: str(req.query.kind),
      q: str(req.query.q),
    })
  );
}

export function newTask(req: AuthRequest, res: Response) {
  return run(res, () => createTask(req.userId!, req.userRole, req.body), 201);
}

export function editTask(req: AuthRequest, res: Response) {
  return run(res, () => updateTask(req.userId!, req.userRole, req.params.id, req.body));
}

export function taskStatus(req: AuthRequest, res: Response) {
  return run(res, () => setTaskStatus(req.userId!, req.userRole, req.params.id, req.body?.done === true));
}

export function removeTask(req: AuthRequest, res: Response) {
  return run(res, () => deleteTask(req.userId!, req.userRole, req.params.id));
}

// ---------- Necessidades ----------
export function needs(req: AuthRequest, res: Response) {
  return run(res, () =>
    listNeeds(req.userId!, req.userRole, {
      status: str(req.query.status),
      category: str(req.query.category),
      region: str(req.query.region),
      linkId: str(req.query.linkId),
      q: str(req.query.q),
    })
  );
}

export function newNeed(req: AuthRequest, res: Response) {
  return run(res, () => createNeed(req.userId!, req.userRole, req.body), 201);
}

export function editNeed(req: AuthRequest, res: Response) {
  return run(res, () => updateNeed(req.userId!, req.userRole, req.params.id, req.body));
}

export function needStatus(req: AuthRequest, res: Response) {
  return run(res, () => setNeedServed(req.userId!, req.userRole, req.params.id, req.body?.served === true));
}

export function needForward(req: AuthRequest, res: Response) {
  return run(res, () => forwardNeed(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeNeed(req: AuthRequest, res: Response) {
  return run(res, () => deleteNeed(req.userId!, req.userRole, req.params.id));
}

// ---------- Produtores e comunidades ----------
export function producers(req: AuthRequest, res: Response) {
  const page = req.query.page ? Number(req.query.page) : undefined;
  return run(res, () =>
    listProducers(req.userId!, req.userRole, {
      kind: str(req.query.kind),
      region: str(req.query.region),
      q: str(req.query.q),
      scope: str(req.query.scope),
      page: page && !isNaN(page) ? page : undefined,
    })
  );
}

export function producerInvite(req: AuthRequest, res: Response) {
  return run(res, () => inviteFromDirectory(req.userId!, req.userRole, req.params.userId, req.body?.notes), 201);
}

export function cooperatives(req: AuthRequest, res: Response) {
  return run(res, () => listCooperatives(req.userId!, req.userRole, { region: str(req.query.region), q: str(req.query.q) }));
}

export function communities(req: AuthRequest, res: Response) {
  return run(res, () => getCommunities(req.userId!, req.userRole, { region: str(req.query.region) }));
}

// ---------- Oportunidades ----------
export function opportunities(req: AuthRequest, res: Response) {
  return run(res, () =>
    listOpportunitiesForAgent(req.userId!, req.userRole, {
      kind: str(req.query.kind),
      area: str(req.query.area),
      region: str(req.query.region),
      q: str(req.query.q),
      linkId: str(req.query.linkId),
    })
  );
}

export function referCreate(req: AuthRequest, res: Response) {
  return run(res, () => refer(req.userId!, req.userRole, req.body), 201);
}

export function referList(req: AuthRequest, res: Response) {
  return run(res, () => listReferrals(req.userId!, req.userRole));
}
