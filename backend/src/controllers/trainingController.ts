import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listMyTrainings,
  getManagedTraining,
  createTraining,
  updateTraining,
  cancelTraining,
  deleteTraining,
  addParticipant,
  updateParticipant,
  completeAttendees,
  removeParticipant,
  addMaterial,
  deleteMaterial,
  listTrainings,
  getTrainingPublic,
  enroll,
  unenroll,
  myEnrollments,
  getCertificate,
  verifyCertificate,
} from "../services/trainingService";

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

// ---------- ONG ----------
export function mine(req: AuthRequest, res: Response) {
  return run(res, () => listMyTrainings(req.userId!, req.userRole, { when: str(req.query.when), q: str(req.query.q) }));
}

export function managed(req: AuthRequest, res: Response) {
  return run(res, () => getManagedTraining(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createTraining(req.userId!, req.userRole, req.body), 201);
}

export function update(req: AuthRequest, res: Response) {
  return run(res, () => updateTraining(req.userId!, req.userRole, req.params.id, req.body));
}

export function cancel(req: AuthRequest, res: Response) {
  return run(res, () => cancelTraining(req.userId!, req.userRole, req.params.id, req.body?.reason));
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => deleteTraining(req.userId!, req.userRole, req.params.id));
}

export function newParticipant(req: AuthRequest, res: Response) {
  return run(res, () => addParticipant(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function editParticipant(req: AuthRequest, res: Response) {
  return run(res, () => updateParticipant(req.userId!, req.userRole, req.params.id, req.params.enrollmentId, req.body));
}

export function completeAll(req: AuthRequest, res: Response) {
  return run(res, () => completeAttendees(req.userId!, req.userRole, req.params.id));
}

export function removeEnrollment(req: AuthRequest, res: Response) {
  return run(res, () => removeParticipant(req.userId!, req.userRole, req.params.id, req.params.enrollmentId));
}

export function newMaterial(req: AuthRequest, res: Response) {
  return run(res, () => addMaterial(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function removeMaterial(req: AuthRequest, res: Response) {
  return run(res, () => deleteMaterial(req.userId!, req.userRole, req.params.id, req.params.materialId));
}

// ---------- Qualquer pessoa ----------
export function list(req: AuthRequest, res: Response) {
  return run(res, () =>
    listTrainings(req.userId!, {
      kind: str(req.query.kind),
      area: str(req.query.area),
      region: str(req.query.region),
      q: str(req.query.q),
      when: str(req.query.when),
    })
  );
}

export function detail(req: AuthRequest, res: Response) {
  return run(res, () => getTrainingPublic(req.userId!, req.params.id), 200, 404);
}

export function join(req: AuthRequest, res: Response) {
  return run(res, () => enroll(req.userId!, req.params.id), 201);
}

export function leave(req: AuthRequest, res: Response) {
  return run(res, () => unenroll(req.userId!, req.params.id));
}

export function enrollments(req: AuthRequest, res: Response) {
  return run(res, () => myEnrollments(req.userId!));
}

export function certificate(req: AuthRequest, res: Response) {
  return run(res, () => getCertificate(req.userId!, req.userRole, req.params.enrollmentId), 200, 404);
}

export function verify(req: AuthRequest, res: Response) {
  return run(res, () => verifyCertificate(req.params.code), 200, 404);
}
