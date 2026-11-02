import { prisma } from "../lib/prisma";
import { clean } from "../lib/agentScope";

const TEN_MIN = 600000;
const MAX_DEVICES = 20;

// Para todas as pessoas: o app avisa quando abre, e a conta guarda os aparelhos que a usam
export async function pingDevice(userId: string, input: any, meta: { ip?: string; userAgent?: string }) {
  const deviceId = String(input?.deviceId ?? "").trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(deviceId)) {
    throw new Error("Aparelho inválido.");
  }

  const label = clean(input?.label, 60);
  const platform = clean(input?.platform, 20);
  const ip = meta.ip ? String(meta.ip).slice(0, 60) : null;
  const userAgent = meta.userAgent ? String(meta.userAgent).slice(0, 200) : null;

  const found = await prisma.userDevice.findUnique({ where: { userId_deviceId: { userId, deviceId } } });
  if (found) {
    if (Date.now() - new Date(found.lastSeenAt).getTime() >= TEN_MIN) {
      await prisma.userDevice.update({ where: { id: found.id }, data: { lastSeenAt: new Date(), ip, userAgent, ...(label ? { label } : {}) } });
    }
    return { known: true, isNew: false };
  }

  const others = await prisma.userDevice.count({ where: { userId } });
  await prisma.userDevice.create({ data: { userId, deviceId, label, platform, ip, userAgent } });

  // Guarda só os 20 aparelhos mais recentes
  if (others + 1 > MAX_DEVICES) {
    const old = await prisma.userDevice.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" }, skip: MAX_DEVICES, select: { id: true } });
    if (old.length > 0) await prisma.userDevice.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }

  // Um aparelho novo numa conta que já tinha outros: avisa a pessoa
  if (others > 0) {
    await prisma.notification.create({
      data: {
        userId,
        type: "SISTEMA",
        title: "Novo aparelho na sua conta",
        message: `Um aparelho novo${label ? ` (${label})` : ""} entrou na sua conta. Se não foi você, mude a palavra-passe e fale com o suporte.`,
      },
    });
  }

  return { known: false, isNew: others > 0 };
}

export async function listDevices(userId: string, currentDeviceId?: string) {
  const rows = await prisma.userDevice.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" }, take: MAX_DEVICES });
  return rows.map((d) => ({
    id: d.id,
    label: d.label,
    platform: d.platform,
    ip: d.ip,
    firstSeenAt: d.firstSeenAt,
    lastSeenAt: d.lastSeenAt,
    isCurrent: !!currentDeviceId && d.deviceId === currentDeviceId,
  }));
}

// Esquece um aparelho da lista. Não termina a sessão nele: para isso, mude a palavra-passe.
export async function removeDevice(userId: string, id: string) {
  const d = await prisma.userDevice.findUnique({ where: { id } });
  if (!d || d.userId !== userId) {
    throw new Error("Aparelho não encontrado.");
  }
  await prisma.userDevice.delete({ where: { id } });
  return { id, removed: true };
}
