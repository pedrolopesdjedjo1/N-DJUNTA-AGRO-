import { AlertType, AlertSeverity } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateAlertInput {
  createdById: string;
  region: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  expiresAt?: Date;
}

export async function createAlert(data: CreateAlertInput) {
  return prisma.weatherAlert.create({
    data: {
      createdById: data.createdById,
      region: data.region,
      type: data.type,
      severity: data.severity,
      title: data.title,
      description: data.description,
      expiresAt: data.expiresAt,
    },
  });
}

// Lista alertas ativos (que ainda não expiraram), opcionalmente por região
export async function listActiveAlerts(region?: string) {
  return prisma.weatherAlert.findMany({
    where: {
      region: region ? { contains: region, mode: "insensitive" } : undefined,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteAlert(id: string) {
  const alert = await prisma.weatherAlert.findUnique({ where: { id } });

  if (!alert) {
    throw new Error("Alerta não encontrado.");
  }

  return prisma.weatherAlert.delete({ where: { id } });
}
