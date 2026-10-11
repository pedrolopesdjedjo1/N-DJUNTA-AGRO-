import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getSettings, updateSettings, changePassword, changePhone } from "../services/settingsService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export function get(req: AuthRequest, res: Response) {
  return run(res, () => getSettings(req.userId!));
}

export function put(req: AuthRequest, res: Response) {
  return run(res, () => updateSettings(req.userId!, req.body));
}

export function password(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Preencha a senha atual e a nova senha." });
  }
  return run(res, () => changePassword(req.userId!, currentPassword, newPassword));
}

export function phone(req: AuthRequest, res: Response) {
  const { phone: newPhone, password: currentPassword } = req.body;
  if (!newPhone || !currentPassword) {
    return res.status(400).json({ error: "Preencha o novo número e a senha." });
  }
  return run(res, () => changePhone(req.userId!, newPhone, currentPassword));
}
