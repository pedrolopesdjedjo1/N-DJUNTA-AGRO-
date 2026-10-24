import { api } from "./client";

export interface NewAccount {
  name: string;
  phone: string;
  password: string;
  role: string;
  location?: string;
}

// Cria a conta de um cliente pela rota de registo que já existe.
// Não usa o contexto de login, por isso o agente continua com a sessão dele.
export async function registerAccount(input: NewAccount): Promise<{ userId: string | null }> {
  const send = (role: string) =>
    api.post("/api/auth/register", {
      name: input.name,
      phone: input.phone,
      password: input.password,
      role,
      location: input.location || undefined,
    });

  let response;
  try {
    response = await send(input.role);
  } catch (error: any) {
    // Alguns servidores chamam "CLIENTE" ao comprador
    if (input.role === "COMPRADOR" && error?.response?.status === 400) {
      response = await send("CLIENTE");
    } else {
      throw error;
    }
  }

  const data: any = response?.data ?? {};
  const userId = data.user?.id ?? data.userId ?? data.id ?? null;
  return { userId: userId ? String(userId) : null };
}
