import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { requestVerification, listRequests, reviewRequest } from "../services/verificationService";

export async function request(req: AuthRequest, res: Response) {
  try {
    const { documentType, documentNote } = req.body;

    if (!documentType) {
      return res.status(400).json({ error: "Informe o tipo de documento." });
    }

    const verification = await requestVerification({
      userId: req.userId!,
      documentType,
      documentNote,
    });

    return res.status(201).json(verification);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Rota restrita ao admin
export async function list(req: AuthRequest, res: Response) {
  try {
    const status = req.query.status as any;
    const requests = await listRequests(status);
    return res.status(200).json(requests);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Rota restrita ao admin
export async function review(req: AuthRequest, res: Response) {
  try {
    const { approve } = req.body;

    if (typeof approve !== "boolean") {
      return res.status(400).json({ error: "Informe approve: true ou false." });
    }

    const result = await reviewRequest(req.params.id, approve);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
