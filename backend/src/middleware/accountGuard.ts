import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { blockInfo } from "../lib/accountBlock";

// Põe-se no server.ts logo a seguir ao express.json(), ANTES do assistGuard e das rotas.
// Uma conta suspensa ou bloqueada deixa de conseguir usar o app, mesmo com a sessão aberta.
// Usa 403 (e não 401) para a mensagem chegar à pessoa em vez de a sessão terminar sem explicação.
export async function accountGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();

  const decoded: any = jwt.decode(header.slice(7));
  if (!decoded || typeof decoded !== "object") return next();

  try {
    const block = await blockInfo([decoded.sub, decoded.userId, decoded.id, decoded.act]);
    if (block) {
      return res.status(403).json({
        error:
          block.kind === "BLOQUEIO"
            ? "A sua conta foi bloqueada. Fale com o suporte: 955 407 156 ou 965 281 785."
            : "A sua conta está suspensa. Fale com o suporte: 955 407 156 ou 965 281 785.",
        code: "ACCOUNT_SUSPENDED",
        kind: block.kind,
        reason: block.reason,
        until: block.until,
      });
    }
  } catch (error) {
    // Se não der para verificar, não se bloqueia ninguém por engano
    console.error("accountGuard", error);
  }

  return next();
}
