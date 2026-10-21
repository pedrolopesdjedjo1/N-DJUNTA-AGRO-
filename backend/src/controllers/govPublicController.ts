import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listServices,
  getService,
  myServices,
  createService,
  updateService,
  setServiceStatus,
  deleteService,
} from "../services/publicServiceService";
import { listPlaces, getPlace, createPlace, updatePlace, setPlaceStatus, deletePlace } from "../services/govPlaceService";

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

// ---------- Serviços públicos ----------
export function services(req: AuthRequest, res: Response) {
  return run(res, () =>
    listServices(req.userId!, {
      category: str(req.query.category),
      region: str(req.query.region),
      q: str(req.query.q),
      status: str(req.query.status),
      ownerId: str(req.query.ownerId),
    })
  );
}

export function service(req: AuthRequest, res: Response) {
  return run(res, () => getService(req.userId!, req.params.id), 200, 404);
}

export function mineServices(req: AuthRequest, res: Response) {
  return run(res, () => myServices(req.userId!, req.userRole));
}

export function newService(req: AuthRequest, res: Response) {
  return run(res, () => createService(req.userId!, req.userRole, req.body), 201);
}

export function editService(req: AuthRequest, res: Response) {
  return run(res, () => updateService(req.userId!, req.userRole, req.params.id, req.body));
}

export function serviceStatus(req: AuthRequest, res: Response) {
  return run(res, () => setServiceStatus(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeService(req: AuthRequest, res: Response) {
  return run(res, () => deleteService(req.userId!, req.userRole, req.params.id));
}

// ---------- Locais: infraestruturas, mercados e zonas de produção ----------
export function places(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPlaces(req.userId!, {
      kind: str(req.query.kind),
      subtype: str(req.query.subtype),
      region: str(req.query.region),
      status: str(req.query.status),
      q: str(req.query.q),
      mine: req.query.mine === "true",
    })
  );
}

export function place(req: AuthRequest, res: Response) {
  return run(res, () => getPlace(req.userId!, req.params.id), 200, 404);
}

export function newPlace(req: AuthRequest, res: Response) {
  return run(res, () => createPlace(req.userId!, req.userRole, req.body), 201);
}

export function editPlace(req: AuthRequest, res: Response) {
  return run(res, () => updatePlace(req.userId!, req.userRole, req.params.id, req.body));
}

export function placeStatus(req: AuthRequest, res: Response) {
  return run(res, () => setPlaceStatus(req.userId!, req.userRole, req.params.id, req.body?.status));
}

export function removePlace(req: AuthRequest, res: Response) {
  return run(res, () => deletePlace(req.userId!, req.userRole, req.params.id));
}
