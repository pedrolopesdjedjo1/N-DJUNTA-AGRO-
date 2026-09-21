import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }
  next();
}
