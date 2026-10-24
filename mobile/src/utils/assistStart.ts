import { startAssist, endAssist } from "../api/agent";
import { getAssist, setAssist } from "./assistMode";

// Começa uma sessão de ajuda na conta de um cliente.
// Se já há uma sessão aberta com outra pessoa, termina-a primeiro.
export async function beginAssist(linkId: string, reason: string) {
  const old = getAssist();
  if (old && old.linkId === linkId) {
    return old;
  }
  if (old) {
    try {
      await endAssist(old.sessionId);
    } catch (error) {
      // termina sozinha
    }
  }

  const r = await startAssist(linkId, reason);
  const session = {
    sessionId: r.sessionId as string,
    token: r.token as string,
    expiresAt: new Date(r.expiresAt).getTime(),
    startedAt: new Date(r.startedAt).getTime(),
    reason: r.reason as string,
    linkId,
    client: r.client,
  };
  setAssist(session);
  return session;
}
