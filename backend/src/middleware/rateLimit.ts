import { Request, Response, NextFunction } from "express";

// Limite de pedidos em memória (sem pacotes extra).
// Funciona por instância do servidor: no Render com uma só instância é suficiente.
// Para usar: app.use("/api/auth", authLimiter, authRoutes);

interface Options {
  windowMs: number; // duração da janela em milissegundos
  max: number; // pedidos permitidos por janela e por IP
  message?: string;
}

interface Hit {
  count: number;
  resetAt: number;
}

export function rateLimit(options: Options) {
  const hits = new Map<string, Hit>();
  const message = options.message || "Demasiados pedidos. Tente novamente mais tarde.";

  // Limpa registos antigos para a memória não crescer
  const timer = setInterval(() => {
    const now = Date.now();
    hits.forEach((hit, key) => {
      if (hit.resetAt <= now) hits.delete(key);
    });
  }, Math.max(options.windowMs, 60 * 1000));
  if (typeof (timer as any).unref === "function") (timer as any).unref();

  return function limiter(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || req.socket?.remoteAddress || "desconhecido";
    const now = Date.now();
    let hit = hits.get(key);

    if (!hit || hit.resetAt <= now) {
      hit = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, hit);
    }

    hit.count += 1;

    if (hit.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
    }

    next();
  };
}

// Login e registo: 30 pedidos por 15 minutos por IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.",
});
