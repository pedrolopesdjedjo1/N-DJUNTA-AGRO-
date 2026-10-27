import { prisma } from "./prisma";

const REFRESH_MS = 30000;

export interface BlockInfo {
  kind: string | null;
  reason: string | null;
  until: Date | null;
}

let state: { at: number; map: Map<string, BlockInfo> } | null = null;
let loading: Promise<void> | null = null;

// Termina uma sanção. Se a pessoa não ficar com nenhuma outra, a conta volta a funcionar
// e os produtos que foram escondidos por causa da sanção voltam a aparecer.
export async function endSanction(s: any, by: string, note: string): Promise<boolean> {
  const others = await prisma.userSanction.findMany({ where: { userId: s.userId, status: "ATIVA", id: { not: s.id } } });

  await prisma.userSanction.update({
    where: { id: s.id },
    data: { status: "TERMINADA", endedAt: new Date(), endedBy: by, endNote: note },
  });

  if (others.length > 0) {
    // Os produtos escondidos passam para a sanção que continua ativa
    if (s.hiddenProductIds.length > 0) {
      await prisma.userSanction.update({
        where: { id: others[0].id },
        data: { hiddenProductIds: Array.from(new Set([...others[0].hiddenProductIds, ...s.hiddenProductIds])) },
      });
    }
    return false;
  }

  await prisma.user.update({ where: { id: s.userId }, data: { isActive: true } });
  if (s.hiddenProductIds.length > 0) {
    await prisma.product.updateMany({ where: { id: { in: s.hiddenProductIds }, ownerId: s.userId }, data: { isAvailable: true } });
  }
  return true;
}

export async function endAllSanctions(userId: string, by: string, note: string) {
  const active = await prisma.userSanction.findMany({ where: { userId, status: "ATIVA" }, orderBy: { createdAt: "asc" } });
  for (const s of active) {
    await endSanction(s, by, note);
  }
  // Conta desativada por outra via (sem registo): também volta a funcionar
  await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  forgetBlocked();
  return active.length;
}

// As suspensões com prazo terminam sozinhas
export async function expireSanctions() {
  const due = await prisma.userSanction.findMany({ where: { status: "ATIVA", kind: "SUSPENSAO", endsAt: { lte: new Date() } } });
  for (const s of due) {
    await endSanction(s, "SISTEMA", "O prazo da suspensão terminou.");
  }
}

async function refresh() {
  try {
    await expireSanctions();
  } catch (error) {
    console.error("expireSanctions", error);
  }

  const [inactive, sanctions] = await Promise.all([
    prisma.user.findMany({ where: { isActive: false }, select: { id: true }, take: 20000 }),
    prisma.userSanction.findMany({ where: { status: "ATIVA" }, select: { userId: true, kind: true, reason: true, endsAt: true } }),
  ]);

  const map = new Map<string, BlockInfo>(inactive.map((u) => [u.id, { kind: null, reason: null, until: null }]));
  sanctions.forEach((s) => map.set(s.userId, { kind: s.kind, reason: s.reason, until: s.endsAt }));
  state = { at: Date.now(), map };
}

export function forgetBlocked() {
  state = null;
}

// Diz se alguma destas contas está suspensa ou bloqueada
export async function blockInfo(ids: (string | null | undefined)[]): Promise<BlockInfo | null> {
  if (!state || Date.now() - state.at > REFRESH_MS) {
    loading = loading ?? refresh().finally(() => {
      loading = null;
    });
    await loading;
  }

  for (const id of ids) {
    if (id && state?.map.has(String(id))) return state.map.get(String(id)) ?? null;
  }
  return null;
}
