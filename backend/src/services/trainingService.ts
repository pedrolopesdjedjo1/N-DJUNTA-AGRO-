import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";
import { AREAS, TRAINING_KINDS, values } from "../lib/ngoCatalog";
import { assertNgo } from "./organizationService";

const KIND_VALUES = values(TRAINING_KINDS);
const AREA_VALUES = values(AREAS);
const ACTIVE = ["INSCRITO", "PRESENTE", "CONCLUIDO", "FALTOU"];
const OWNER_STATUS = ["INSCRITO", "PRESENTE", "FALTOU", "CONCLUIDO"];
const MATERIAL_KINDS = ["DOCUMENTO", "VIDEO", "LINK"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_MATERIALS = 20;

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function validStorageUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

function readPhone(value: any): string | null {
  const phone = clean(value, 20);
  if (phone && !/^[+\d][\d\s-]{5,19}$/.test(phone)) {
    throw new Error(`Telefone inválido: ${phone}`);
  }
  return phone;
}

function readInt(value: any, label: string, min: number, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Math.floor(Number(value));
  if (isNaN(n) || n < min || n > max) {
    throw new Error(`${label} inválido.`);
  }
  return n;
}

function dateText(value: any) {
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

async function makeCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    let suffix = "";
    randomBytes(8).forEach((b) => {
      suffix += CODE_ALPHABET[b % CODE_ALPHABET.length];
    });
    const code = `CERT-${suffix}`;
    const exists = await prisma.trainingEnrollment.findUnique({ where: { certificateCode: code } });
    if (!exists) return code;
  }
  throw new Error("Não foi possível gerar o código do certificado. Tente de novo.");
}

async function issueCertificate(enrollment: any) {
  if (enrollment.certificateCode) return enrollment;
  return prisma.trainingEnrollment.update({
    where: { id: enrollment.id },
    data: { certificateCode: await makeCode(), certifiedAt: new Date() },
  });
}

async function orgInfo(ownerIds: string[]) {
  const ids = Array.from(new Set(ownerIds));
  const map = new Map<string, { name: string; logoUrl: string | null; isVerified: boolean }>();
  if (ids.length === 0) return map;

  const [orgs, users] = await Promise.all([
    prisma.organization.findMany({ where: { ownerId: { in: ids } }, select: { ownerId: true, name: true, logoUrl: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, isVerified: true } }),
  ]);
  const orgMap = new Map(orgs.map((o) => [o.ownerId, o]));

  users.forEach((u) =>
    map.set(u.id, {
      name: orgMap.get(u.id)?.name ?? u.name,
      logoUrl: orgMap.get(u.id)?.logoUrl ?? null,
      isVerified: u.isVerified,
    })
  );
  return map;
}

async function activeCounts(trainingIds: string[]) {
  const map = new Map<string, number>();
  if (trainingIds.length === 0) return map;

  const rows = await prisma.trainingEnrollment.groupBy({
    by: ["trainingId"],
    where: { trainingId: { in: trainingIds }, status: { in: ACTIVE } },
    _count: { _all: true },
  });
  rows.forEach((r) => map.set(r.trainingId, r._count._all));
  return map;
}

function isFinished(t: any) {
  return new Date(t.endsAt ?? t.startsAt).getTime() < Date.now();
}

function readTraining(input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.title !== undefined) {
    const title = clean(input?.title, 150);
    if (!title || title.length < 3) {
      throw new Error("Escreva o título da formação.");
    }
    data.title = title;
  }

  if (!existing || input?.kind !== undefined) {
    const kind = String(input?.kind ?? "CURSO");
    if (!KIND_VALUES.includes(kind)) {
      throw new Error("Tipo de formação inválido.");
    }
    data.kind = kind;
  }

  if (input?.description !== undefined) data.description = clean(input.description, 2000);

  if (input?.area !== undefined) {
    const area = input.area ? String(input.area) : null;
    if (area && !AREA_VALUES.includes(area)) {
      throw new Error("Área inválida.");
    }
    data.area = area;
  }

  if (input?.region !== undefined) data.region = clean(input.region, 80);
  if (input?.location !== undefined) data.location = clean(input.location, 150);
  if (input?.isOnline !== undefined) data.isOnline = Boolean(input.isOnline);

  if (input?.onlineLink !== undefined) {
    const link = clean(input.onlineLink, 300);
    if (link && !/^https:\/\/\S+$/i.test(link)) {
      throw new Error("O endereço da sessão online deve começar por https://");
    }
    data.onlineLink = link;
  }

  if (input?.lat !== undefined || input?.lng !== undefined) {
    const has = (v: any) => v !== undefined && v !== null && v !== "";
    if (!has(input?.lat) && !has(input?.lng)) {
      data.lat = null;
      data.lng = null;
    } else {
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      if (!has(input.lat) || !has(input.lng) || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error("Coordenadas inválidas.");
      }
      data.lat = lat;
      data.lng = lng;
    }
  }

  if (!existing || input?.startsAt !== undefined) {
    const start = input?.startsAt ? new Date(input.startsAt) : null;
    if (!start || isNaN(start.getTime())) {
      throw new Error("Escolha a data e a hora de início.");
    }
    data.startsAt = start;
  }

  if (input?.endsAt !== undefined) {
    if (input.endsAt === null || input.endsAt === "") {
      data.endsAt = null;
    } else {
      const end = new Date(input.endsAt);
      if (isNaN(end.getTime())) {
        throw new Error("Data de fim inválida.");
      }
      data.endsAt = end;
    }
  }

  const finalStart: Date = data.startsAt ?? existing?.startsAt;
  const finalEnd: Date | null = data.endsAt !== undefined ? data.endsAt : existing?.endsAt ?? null;
  if (finalEnd && finalEnd.getTime() < finalStart.getTime()) {
    throw new Error("O fim deve ser depois do início.");
  }

  const hours = readInt(input?.hours, "Carga horária", 1, 400);
  if (hours !== undefined) data.hours = hours;
  const capacity = readInt(input?.capacity, "Número de vagas", 1, 100000);
  if (capacity !== undefined) data.capacity = capacity;

  const online = data.isOnline ?? existing?.isOnline ?? false;
  const location = data.location !== undefined ? data.location : existing?.location ?? null;
  if (!online && !location) {
    throw new Error("Escreva o local da formação.");
  }

  return data;
}

async function ownTraining(userId: string, id: string) {
  const training = await prisma.training.findUnique({ where: { id } });
  if (!training || training.ownerId !== userId) {
    throw new Error("Formação não encontrada.");
  }
  return training;
}

// ---------- Para a ONG: gerir formações ----------
export async function listMyTrainings(
  userId: string,
  role: string | undefined,
  filters: { when?: string; q?: string }
) {
  assertNgo(role);

  const now = new Date();
  const where: any = { ownerId: userId };
  if (filters.q) where.title = { contains: filters.q, mode: "insensitive" };
  if (filters.when === "upcoming") {
    where.status = "ABERTA";
    where.OR = [{ startsAt: { gte: now } }, { endsAt: { gte: now } }];
  } else if (filters.when === "past") {
    where.AND = [{ startsAt: { lt: now } }, { OR: [{ endsAt: null }, { endsAt: { lt: now } }] }];
  }

  const trainings = await prisma.training.findMany({
    where,
    orderBy: { startsAt: filters.when === "past" ? "desc" : "asc" },
    take: 200,
  });
  const ids = trainings.map((t) => t.id);

  const rows = ids.length
    ? await prisma.trainingEnrollment.groupBy({
        by: ["trainingId", "status"],
        where: { trainingId: { in: ids } },
        _count: { _all: true },
      })
    : [];

  const stats = new Map<string, { enrolled: number; concluded: number; present: number }>();
  rows.forEach((r) => {
    const s = stats.get(r.trainingId) ?? { enrolled: 0, concluded: 0, present: 0 };
    if (ACTIVE.includes(r.status)) s.enrolled += r._count._all;
    if (r.status === "CONCLUIDO") s.concluded += r._count._all;
    if (r.status === "PRESENTE") s.present += r._count._all;
    stats.set(r.trainingId, s);
  });

  return trainings.map((t) => ({
    ...t,
    finished: isFinished(t),
    ...(stats.get(t.id) ?? { enrolled: 0, concluded: 0, present: 0 }),
  }));
}

export async function getManagedTraining(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const training = await ownTraining(userId, id);

  const [enrollments, materials] = await Promise.all([
    prisma.trainingEnrollment.findMany({ where: { trainingId: id }, orderBy: { createdAt: "asc" } }),
    prisma.trainingMaterial.findMany({ where: { trainingId: id }, orderBy: { createdAt: "asc" } }),
  ]);

  const userIds = Array.from(new Set(enrollments.map((e) => e.userId).filter(Boolean))) as string[];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true, location: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    training: { ...training, finished: isFinished(training) },
    materials,
    participants: enrollments.map((e) => {
      const u = e.userId ? userMap.get(e.userId) : null;
      return {
        id: e.id,
        userId: e.userId,
        name: u?.name ?? e.name ?? "Participante",
        phone: u?.phone ?? e.phone ?? null,
        location: u?.location ?? null,
        inApp: !!e.userId,
        status: e.status,
        certificateCode: e.certificateCode,
        certifiedAt: e.certifiedAt,
        createdAt: e.createdAt,
      };
    }),
    counts: {
      enrolled: enrollments.filter((e) => ACTIVE.includes(e.status)).length,
      present: enrollments.filter((e) => e.status === "PRESENTE").length,
      concluded: enrollments.filter((e) => e.status === "CONCLUIDO").length,
    },
  };
}

export async function createTraining(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  const data = readTraining(input);
  let projectId: string | null = null;
  if (input?.projectId) {
    const project = await prisma.ngoProject.findUnique({ where: { id: String(input.projectId) } });
    if (!project || project.ownerId !== userId) {
      throw new Error("Projeto não encontrado.");
    }
    projectId = project.id;
  }

  return prisma.training.create({ data: { ownerId: userId, projectId, ...data } });
}

export async function updateTraining(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);
  const training = await ownTraining(userId, id);

  const data = readTraining(input, training);

  if (input?.status !== undefined) {
    if (!["ABERTA", "CONCLUIDA"].includes(String(input.status))) {
      throw new Error("Para cancelar use o botão Cancelar formação.");
    }
    data.status = String(input.status);
  }
  if (input?.projectId !== undefined) {
    if (input.projectId) {
      const project = await prisma.ngoProject.findUnique({ where: { id: String(input.projectId) } });
      if (!project || project.ownerId !== userId) {
        throw new Error("Projeto não encontrado.");
      }
      data.projectId = project.id;
    } else {
      data.projectId = null;
    }
  }

  if (data.capacity !== undefined && data.capacity !== null) {
    const active = await prisma.trainingEnrollment.count({ where: { trainingId: id, status: { in: ACTIVE } } });
    if (data.capacity < active) {
      throw new Error(`Já há ${active} participantes: o número de vagas não pode ser menor.`);
    }
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }
  return prisma.training.update({ where: { id }, data });
}

export async function cancelTraining(userId: string, role: string | undefined, id: string, reason: any) {
  assertNgo(role);
  const training = await ownTraining(userId, id);
  if (training.status === "CANCELADA") {
    throw new Error("Esta formação já foi cancelada.");
  }

  await prisma.training.update({ where: { id }, data: { status: "CANCELADA" } });

  const enrolled = await prisma.trainingEnrollment.findMany({
    where: { trainingId: id, userId: { not: null }, status: { in: ACTIVE } },
    select: { userId: true },
  });
  const text = clean(reason, 200);
  if (enrolled.length > 0) {
    await prisma.notification.createMany({
      data: enrolled.map((e) => ({
        userId: e.userId as string,
        type: "SISTEMA" as const,
        title: "Formação cancelada",
        message: `${training.title}${text ? `: ${text}` : ""}`,
        relatedId: id,
      })),
    });
  }

  return { id, status: "CANCELADA", notified: enrolled.length };
}

export async function deleteTraining(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  await ownTraining(userId, id);

  const active = await prisma.trainingEnrollment.count({ where: { trainingId: id, status: { in: ACTIVE } } });
  if (active > 0) {
    throw new Error("Esta formação já tem participantes. Cancele-a em vez de a apagar.");
  }

  await prisma.training.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Participantes e certificados (ONG) ----------
export async function addParticipant(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);
  const training = await ownTraining(userId, id);
  if (training.status === "CANCELADA") {
    throw new Error("Esta formação foi cancelada.");
  }

  if (training.capacity) {
    const active = await prisma.trainingEnrollment.count({ where: { trainingId: id, status: { in: ACTIVE } } });
    if (active >= training.capacity) {
      throw new Error("A formação já não tem vagas.");
    }
  }

  let linked: { id: string; name: string } | null = null;
  if (input?.userId) {
    linked = await prisma.user.findUnique({ where: { id: String(input.userId) }, select: { id: true, name: true } });
    if (!linked) {
      throw new Error("Pessoa do app não encontrada.");
    }
    const exists = await prisma.trainingEnrollment.findFirst({ where: { trainingId: id, userId: linked.id } });
    if (exists) {
      throw new Error("Esta pessoa já está inscrita.");
    }
  }

  const name = clean(input?.name, 120) ?? linked?.name ?? null;
  if (!name || name.length < 2) {
    throw new Error("Escreva o nome do participante.");
  }
  const phone = readPhone(input?.phone);

  const created = await prisma.trainingEnrollment.create({
    data: { trainingId: id, userId: linked?.id ?? null, name: linked ? null : name, phone: linked ? null : phone },
  });

  if (linked) {
    await prisma.notification.create({
      data: {
        userId: linked.id,
        type: "SISTEMA",
        title: "Foi inscrito numa formação",
        message: `${training.title} (${dateText(training.startsAt)})`,
        relatedId: id,
      },
    });
  }

  return created;
}

export async function updateParticipant(
  userId: string,
  role: string | undefined,
  id: string,
  enrollmentId: string,
  input: any
) {
  assertNgo(role);
  const training = await ownTraining(userId, id);

  const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.trainingId !== id) {
    throw new Error("Participante não encontrado.");
  }

  const status = String(input?.status ?? "");
  if (!OWNER_STATUS.includes(status)) {
    throw new Error("Estado inválido.");
  }

  let updated = await prisma.trainingEnrollment.update({ where: { id: enrollmentId }, data: { status } });

  if (status === "CONCLUIDO") {
    const before = enrollment.certificateCode;
    updated = await issueCertificate(updated);
    if (!before && updated.userId) {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          type: "SISTEMA",
          title: "Certificado disponível",
          message: `Concluiu: ${training.title}. Veja o seu certificado.`,
          relatedId: updated.id,
        },
      });
    }
  } else if (enrollment.certificateCode) {
    updated = await prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: { certificateCode: null, certifiedAt: null },
    });
  }

  return updated;
}

export async function completeAttendees(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const training = await ownTraining(userId, id);

  const present = await prisma.trainingEnrollment.findMany({ where: { trainingId: id, status: "PRESENTE" } });
  if (present.length === 0) {
    throw new Error("Não há participantes marcados como presentes.");
  }

  let issued = 0;
  for (const enrollment of present) {
    const updated = await issueCertificate(
      await prisma.trainingEnrollment.update({ where: { id: enrollment.id }, data: { status: "CONCLUIDO" } })
    );
    issued += 1;
    if (updated.userId) {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          type: "SISTEMA",
          title: "Certificado disponível",
          message: `Concluiu: ${training.title}. Veja o seu certificado.`,
          relatedId: updated.id,
        },
      });
    }
  }

  await prisma.training.update({ where: { id }, data: { status: "CONCLUIDA" } });
  return { completed: issued };
}

export async function removeParticipant(userId: string, role: string | undefined, id: string, enrollmentId: string) {
  assertNgo(role);
  await ownTraining(userId, id);

  const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.trainingId !== id) {
    throw new Error("Participante não encontrado.");
  }

  await prisma.trainingEnrollment.delete({ where: { id: enrollmentId } });
  return { id: enrollmentId, deleted: true };
}

// ---------- Materiais educativos ----------
export async function addMaterial(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);
  await ownTraining(userId, id);

  const kind = String(input?.kind ?? "");
  if (!MATERIAL_KINDS.includes(kind)) {
    throw new Error("Tipo de material inválido.");
  }
  const title = clean(input?.title, 120);
  if (!title) {
    throw new Error("Escreva o título do material.");
  }

  const url = clean(input?.url, 500);
  const external = !!url && /^https:\/\/\S+$/i.test(url);
  if (!url || (kind === "DOCUMENTO" && !validStorageUrl(url)) || (kind !== "DOCUMENTO" && !external)) {
    throw new Error(kind === "DOCUMENTO" ? "Ficheiro inválido. Envie o documento pelo app." : "O endereço deve começar por https://");
  }

  const count = await prisma.trainingMaterial.count({ where: { trainingId: id } });
  if (count >= MAX_MATERIALS) {
    throw new Error(`Cada formação aceita até ${MAX_MATERIALS} materiais.`);
  }

  return prisma.trainingMaterial.create({ data: { trainingId: id, kind, title, url } });
}

export async function deleteMaterial(userId: string, role: string | undefined, id: string, materialId: string) {
  assertNgo(role);
  await ownTraining(userId, id);

  const material = await prisma.trainingMaterial.findUnique({ where: { id: materialId } });
  if (!material || material.trainingId !== id) {
    throw new Error("Material não encontrado.");
  }

  await prisma.trainingMaterial.delete({ where: { id: materialId } });
  return { id: materialId, deleted: true };
}

// ---------- Para qualquer pessoa: ver e inscrever-se ----------
async function shapePublic(userId: string, trainings: any[]) {
  const ids = trainings.map((t) => t.id);
  const [orgs, counts, mine] = await Promise.all([
    orgInfo(trainings.map((t) => t.ownerId)),
    activeCounts(ids),
    ids.length
      ? prisma.trainingEnrollment.findMany({ where: { trainingId: { in: ids }, userId } })
      : Promise.resolve([] as any[]),
  ]);
  const mineMap = new Map((mine as any[]).map((e) => [e.trainingId, e]));

  return trainings.map((t) => {
    const taken = counts.get(t.id) ?? 0;
    const enrollment = mineMap.get(t.id);
    return {
      ...t,
      finished: isFinished(t),
      enrolledCount: taken,
      spotsLeft: t.capacity ? Math.max(0, t.capacity - taken) : null,
      organization: orgs.get(t.ownerId) ?? null,
      enrolled: !!enrollment,
      myStatus: enrollment?.status ?? null,
      isMine: t.ownerId === userId,
    };
  });
}

export async function listTrainings(
  userId: string,
  filters: { kind?: string; area?: string; region?: string; q?: string; when?: string }
) {
  const now = new Date();
  const where: any = { status: { not: "CANCELADA" } };
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.area && AREA_VALUES.includes(filters.area)) where.area = filters.area;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.q) where.title = { contains: filters.q, mode: "insensitive" };

  if (filters.when === "past") {
    where.AND = [{ startsAt: { lt: now } }, { OR: [{ endsAt: null }, { endsAt: { lt: now } }] }];
  } else if (filters.when !== "all") {
    where.status = "ABERTA";
    where.OR = [{ startsAt: { gte: now } }, { endsAt: { gte: now } }];
  }

  const trainings = await prisma.training.findMany({
    where,
    orderBy: { startsAt: filters.when === "past" ? "desc" : "asc" },
    take: 100,
  });
  return shapePublic(userId, trainings);
}

export async function getTrainingPublic(userId: string, id: string) {
  const training = await prisma.training.findUnique({ where: { id } });
  if (!training || (training.status === "CANCELADA" && training.ownerId !== userId)) {
    throw new Error("Formação não encontrada.");
  }

  const [item] = await shapePublic(userId, [training]);
  const materials = await prisma.trainingMaterial.findMany({ where: { trainingId: id }, orderBy: { createdAt: "asc" } });

  const canSeeMaterials = item.enrolled || item.isMine;
  const enrollment = item.enrolled ? await prisma.trainingEnrollment.findFirst({ where: { trainingId: id, userId } }) : null;

  return {
    training: { ...item, onlineLink: canSeeMaterials ? item.onlineLink : null },
    materialsCount: materials.length,
    materials: canSeeMaterials ? materials : [],
    enrollment: enrollment
      ? { id: enrollment.id, status: enrollment.status, certificateCode: enrollment.certificateCode }
      : null,
  };
}

export async function enroll(userId: string, id: string) {
  const training = await prisma.training.findUnique({ where: { id } });
  if (!training) {
    throw new Error("Formação não encontrada.");
  }
  if (training.ownerId === userId) {
    throw new Error("Não pode inscrever-se na sua própria formação. Use a lista de participantes.");
  }
  if (training.status !== "ABERTA") {
    throw new Error("As inscrições desta formação estão fechadas.");
  }
  if (isFinished(training)) {
    throw new Error("Esta formação já terminou.");
  }

  const exists = await prisma.trainingEnrollment.findFirst({ where: { trainingId: id, userId } });
  if (exists) {
    throw new Error("Já está inscrito nesta formação.");
  }

  if (training.capacity) {
    const active = await prisma.trainingEnrollment.count({ where: { trainingId: id, status: { in: ACTIVE } } });
    if (active >= training.capacity) {
      throw new Error("A formação já não tem vagas.");
    }
  }

  const created = await prisma.trainingEnrollment.create({ data: { trainingId: id, userId } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.notification.create({
    data: {
      userId: training.ownerId,
      type: "SISTEMA",
      title: "Nova inscrição",
      message: `${user?.name ?? "Uma pessoa"} inscreveu-se em ${training.title}.`,
      relatedId: id,
    },
  });

  return created;
}

export async function unenroll(userId: string, id: string) {
  const enrollment = await prisma.trainingEnrollment.findFirst({ where: { trainingId: id, userId } });
  if (!enrollment) {
    throw new Error("Não está inscrito nesta formação.");
  }
  if (enrollment.status !== "INSCRITO") {
    throw new Error("Já não é possível cancelar a inscrição. Fale com a organização.");
  }

  await prisma.trainingEnrollment.delete({ where: { id: enrollment.id } });
  return { id, enrolled: false };
}

export async function myEnrollments(userId: string) {
  const rows = await prisma.trainingEnrollment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  if (rows.length === 0) return [];

  const trainings = await prisma.training.findMany({ where: { id: { in: rows.map((r) => r.trainingId) } } });
  const map = new Map(trainings.map((t) => [t.id, t]));
  const orgs = await orgInfo(trainings.map((t) => t.ownerId));

  return rows
    .map((r) => {
      const t = map.get(r.trainingId);
      if (!t) return null;
      return {
        id: r.id,
        status: r.status,
        certificateCode: r.certificateCode,
        certifiedAt: r.certifiedAt,
        training: {
          id: t.id,
          title: t.title,
          kind: t.kind,
          startsAt: t.startsAt,
          endsAt: t.endsAt,
          location: t.location,
          isOnline: t.isOnline,
          hours: t.hours,
          status: t.status,
        },
        organization: orgs.get(t.ownerId) ?? null,
      };
    })
    .filter(Boolean);
}

// ---------- Certificados ----------
function certificateText(c: any) {
  const kind = TRAINING_KINDS.find((k) => k.value === c.training.kind)?.label.toLowerCase() ?? "formação";
  return [
    "CERTIFICADO NÔDJUNTA AGRO",
    `Código: ${c.code}`,
    "",
    `Certifica-se que ${c.participantName} concluiu o ${kind} "${c.training.title}", promovido por ${c.organization.name}${
      c.training.hours ? `, com a duração de ${c.training.hours} horas` : ""
    }, realizado em ${dateText(c.training.startsAt)}.`,
    "",
    `Emitido em ${dateText(c.issuedAt)} por ${c.organization.name} através do NÔDJUNTA AGRO.`,
    "Para confirmar a autenticidade, use o código acima no app NÔDJUNTA AGRO.",
  ].join("\n");
}

async function buildCertificate(enrollment: any) {
  if (!enrollment.certificateCode) {
    throw new Error("Este participante ainda não tem certificado.");
  }

  const training = await prisma.training.findUnique({ where: { id: enrollment.trainingId } });
  if (!training) {
    throw new Error("Formação não encontrada.");
  }

  const [orgs, user] = await Promise.all([
    orgInfo([training.ownerId]),
    enrollment.userId
      ? prisma.user.findUnique({ where: { id: enrollment.userId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const certificate: any = {
    code: enrollment.certificateCode,
    participantName: user?.name ?? enrollment.name ?? "Participante",
    issuedAt: enrollment.certifiedAt ?? enrollment.updatedAt,
    training: {
      id: training.id,
      title: training.title,
      kind: training.kind,
      hours: training.hours,
      startsAt: training.startsAt,
      endsAt: training.endsAt,
      location: training.location,
    },
    organization: orgs.get(training.ownerId) ?? { name: "Organização", logoUrl: null, isVerified: false },
  };
  certificate.text = certificateText(certificate);
  return certificate;
}

export async function getCertificate(userId: string, role: string | undefined, enrollmentId: string) {
  const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) {
    throw new Error("Certificado não encontrado.");
  }

  const training = await prisma.training.findUnique({ where: { id: enrollment.trainingId }, select: { ownerId: true } });
  const allowed = enrollment.userId === userId || training?.ownerId === userId || role === "ADMIN";
  if (!allowed) {
    throw new Error("Certificado não encontrado.");
  }

  return buildCertificate(enrollment);
}

export async function verifyCertificate(codeInput: string) {
  const code = String(codeInput ?? "").trim().toUpperCase();
  const enrollment = code ? await prisma.trainingEnrollment.findUnique({ where: { certificateCode: code } }) : null;
  if (!enrollment) {
    throw new Error("Certificado não encontrado. Confira o código.");
  }

  const certificate = await buildCertificate(enrollment);
  return { valid: true, ...certificate };
}
