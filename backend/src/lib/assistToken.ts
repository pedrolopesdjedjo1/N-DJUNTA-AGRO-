import jwt from "jsonwebtoken";

export interface AssistClaims {
  act?: string;
  sid?: string;
  sub?: string;
  userId?: string;
}

// Chave de segurança: a mesma que o login já usa
function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("Configuração do servidor incompleta: falta a chave de segurança (JWT_SECRET).");
  }
  return value;
}

// Token curto da conta do cliente, com a marca do agente que o está a ajudar.
// Leva todos os nomes de campo habituais, para o login existente o reconhecer.
export function signAssistToken(client: { id: string; role: string }, agentId: string, sessionId: string, expiresAt: Date): string {
  const seconds = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return jwt.sign(
    {
      userId: client.id,
      id: client.id,
      sub: client.id,
      role: client.role,
      userRole: client.role,
      act: agentId,
      sid: sessionId,
    },
    secret(),
    { expiresIn: seconds }
  );
}

// Devolve as marcas só se for um token de ajuda válido. Tokens normais, falsos ou expirados dão null.
export function readAssistClaims(token: string): AssistClaims | null {
  try {
    const decoded = jwt.decode(token) as AssistClaims | null;
    if (!decoded || typeof decoded !== "object" || !decoded.act) return null;
    return jwt.verify(token, secret()) as AssistClaims;
  } catch (error) {
    return null;
  }
}
