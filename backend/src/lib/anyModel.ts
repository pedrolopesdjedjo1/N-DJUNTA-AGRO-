import { prisma } from "./prisma";

// Devolve o primeiro modelo que existir com um destes nomes (ou null).
// Serve para ler tabelas antigas do app sem partir se o nome for outro.
export function anyModel(...names: string[]): any | null {
  for (const name of names) {
    const delegate = (prisma as any)[name];
    if (delegate && typeof delegate.findMany === "function") return delegate;
  }
  return null;
}

export async function readAll(delegate: any | null, take = 3000): Promise<any[]> {
  if (!delegate) return [];
  try {
    return (await delegate.findMany({ take })) as any[];
  } catch (error) {
    console.error("readAll", error);
    return [];
  }
}

// Dono de uma linha (o nome do campo varia conforme o conteúdo)
export function ownerOf(row: any): string {
  return String(row?.ownerId ?? row?.userId ?? row?.authorId ?? row?.createdBy ?? row?.organizationId ?? "");
}

export function titleOf(row: any): string {
  return String(row?.title ?? row?.name ?? row?.subject ?? "Sem título");
}

export function byNewest(a: any, b: any): number {
  return new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime();
}
