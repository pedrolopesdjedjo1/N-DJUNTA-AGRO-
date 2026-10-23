import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { readAssistClaims, AssistClaims } from "../lib/assistToken";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// Durante uma sessão de ajuda, estas ações só a própria pessoa pode fazer
const BLOCKED_PREFIXES = ["/api/auth", "/api/settings", "/api/verification", "/api/agent"];

const CACHE_MS = 15000;
const cache = new Map<string, { ok: boolean; at: number }>();

const LABELS: [RegExp, string][] = [
  [/^POST \/api\/products\/?$/, "Publicou um produto"],
  [/^(PUT|PATCH) \/api\/products\//, "Atualizou um produto"],
  [/^DELETE \/api\/products\//, "Apagou um produto"],
  [/^POST \/api\/(client\/)?orders\/?$/, "Fez uma encomenda"],
  [/\/cart/, "Mexeu no carrinho"],
  [/\/(payments?|pay)(\/|$)/, "Tratou de um pagamento"],
  [/\/(transport|deliver|deliveries|tracking)/, "Tratou de um transporte"],
  [/\/orders\//, "Atualizou uma encomenda"],
  [/\/(profile|store|stores)(\/|$)/, "Atualizou o perfil"],
];

// Chamado quando uma sessão termina ou um acesso é retirado: a decisão deixa de estar guardada
export function forgetAssistCache() {
  cache.clear();
}

async function sessionOk(claims: AssistClaims): Promise<boolean> {
  const sid = String(claims.sid);
  const cached = cache.get(sid);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.ok;

  const session = await prisma.agentSession.findUnique({ where: { id: sid } });
  let ok =
    !!session &&
    !session.endedAt &&
    session.expiresAt.getTime() > Date.now() &&
    session.agentId === claims.act &&
    session.clientId === (claims.sub ?? claims.userId);

  if (ok && session) {
    const [link, profile] = await Promise.all([
      session.linkId ? prisma.agentClient.findUnique({ where: { id: session.linkId } }) : Promise.resolve(null),
      prisma.agentProfile.findUnique({ where: { userId: session.agentId } }),
    ]);
    ok = !!link && link.status === "ATIVO" && !!profile && profile.status === "APROVADO" && profile.canAssist;
  }

  cache.set(sid, { ok, at: Date.now() });
  return ok;
}

// Põe-se no server.ts antes das rotas. Só mexe nos pedidos feitos com um token de ajuda.
export async function assistGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();

  const claims = readAssistClaims(header.slice(7));
  if (!claims || !claims.act || !claims.sid) return next();

  try {
    if (!(await sessionOk(claims))) {
      return res.status(401).json({ error: "A sessão de ajuda terminou. Volte à área do agente.", code: "ASSIST_ENDED" });
    }

    if (SAFE_METHODS.includes(req.method)) return next();

    const path = req.originalUrl.split("?")[0];
    if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      return res.status(403).json({ error: "Esta ação só pode ser feita pela própria pessoa." });
    }

    const label = LABELS.find(([re]) => re.test(`${req.method} ${path}`))?.[1] ?? "Fez uma alteração na conta";
    const agentId = String(claims.act);
    const clientId = String(claims.sub ?? claims.userId);
    const sessionId = String(claims.sid);

    // Só conta as ações que correram bem
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      prisma.agentActivity
        .create({ data: { agentId, clientId, kind: "ACAO_ASSISTIDA", message: label, relatedId: sessionId } })
        .then(() => prisma.agentSession.update({ where: { id: sessionId }, data: { actions: { increment: 1 } } }))
        .catch((e) => console.error("assistGuard: registo da ação", e));
    });

    return next();
  } catch (error) {
    console.error("assistGuard", error);
    return res.status(503).json({ error: "Não foi possível validar a sessão de ajuda. Tente de novo." });
  }
}
