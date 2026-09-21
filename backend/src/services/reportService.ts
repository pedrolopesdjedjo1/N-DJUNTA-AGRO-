import { PrismaClient, ReportTargetType, ReportStatus } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateReportInput {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export async function createReport(data: CreateReportInput) {
  return prisma.report.create({
    data: {
      reporterId: data.reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
    },
  });
}

// Usado pelo admin - lista denúncias, com opção de filtrar por status
export async function listReports(status?: ReportStatus) {
  return prisma.report.findMany({
    where: { status },
    include: {
      reporter: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Usado pelo admin - marca a denúncia como revisada
export async function updateReportStatus(reportId: string, status: ReportStatus) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    throw new Error("Denúncia não encontrada.");
  }

  return prisma.report.update({
    where: { id: reportId },
    data: { status },
  });
}
