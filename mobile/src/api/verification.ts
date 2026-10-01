import { api } from "./client";

export type VerificationStatus = "PENDENTE" | "APROVADO" | "REJEITADO";

export type VerificationRequest = {
  id: string;
  userId: string;
  documentType: string;
  documentNote?: string | null;
  status: VerificationStatus;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: string;
    phone?: string | null;
  };
};

const BASE_PATHS = ["/api/verification", "/api/verifications"];
let workingBase: string | null = null;

async function withBase<T>(call: (base: string) => Promise<T>): Promise<T> {
  const candidates = workingBase ? [workingBase] : BASE_PATHS;
  let lastError: any;

  for (const base of candidates) {
    try {
      const result = await call(base);
      workingBase = base;
      return result;
    } catch (err: any) {
      lastError = err;
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }
  throw lastError;
}

export function verificationErrorMessage(err: any): string {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    "Ocorreu um erro. Tente novamente."
  );
}

export async function requestVerification(
  documentType: string,
  documentNote?: string
) {
  return withBase(async (base) => {
    const response = await api.post(base, {
      documentType,
      documentNote: documentNote || undefined,
    });
    return response.data;
  });
}

export async function listVerifications(
  status?: VerificationStatus
): Promise<VerificationRequest[]> {
  return withBase(async (base) => {
    const response = await api.get(base, {
      params: status ? { status } : undefined,
    });
    const data = response.data;
    return Array.isArray(data) ? data : data?.requests || [];
  });
}

export async function reviewVerification(id: string, approve: boolean) {
  return withBase(async (base) => {
    const response = await api.patch(`${base}/${id}/review`, { approve });
    return response.data;
  });
}
