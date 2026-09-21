import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateTransportOfferInput {
  transporterId: string;
  origin: string;
  destination: string;
  capacity: string;
  price: number;
  availableDate: Date;
  notes?: string;
}

export async function createTransportOffer(data: CreateTransportOfferInput) {
  return prisma.transportOffer.create({
    data: {
      transporterId: data.transporterId,
      origin: data.origin,
      destination: data.destination,
      capacity: data.capacity,
      price: data.price,
      availableDate: data.availableDate,
      notes: data.notes,
    },
  });
}

interface ListTransportFilters {
  origin?: string;
  destination?: string;
}

export async function listTransportOffers(filters: ListTransportFilters) {
  return prisma.transportOffer.findMany({
    where: {
      isActive: true,
      origin: filters.origin ? { contains: filters.origin, mode: "insensitive" } : undefined,
      destination: filters.destination
        ? { contains: filters.destination, mode: "insensitive" }
        : undefined,
    },
    include: {
      transporter: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { availableDate: "asc" },
  });
}

export async function updateTransportOffer(
  id: string,
  transporterId: string,
  data: Partial<CreateTransportOfferInput> & { isActive?: boolean }
) {
  const offer = await prisma.transportOffer.findUnique({ where: { id } });

  if (!offer) {
    throw new Error("Oferta de transporte não encontrada.");
  }

  if (offer.transporterId !== transporterId) {
    throw new Error("Você não tem permissão para editar esta oferta.");
  }

  return prisma.transportOffer.update({ where: { id }, data });
}

export async function deleteTransportOffer(id: string, transporterId: string) {
  const offer = await prisma.transportOffer.findUnique({ where: { id } });

  if (!offer) {
    throw new Error("Oferta de transporte não encontrada.");
  }

  if (offer.transporterId !== transporterId) {
    throw new Error("Você não tem permissão para excluir esta oferta.");
  }

  return prisma.transportOffer.delete({ where: { id } });
}
