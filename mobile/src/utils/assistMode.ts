import { useEffect, useState } from "react";
import { api } from "../api/client";

export interface AssistSession {
  sessionId: string;
  token: string;
  expiresAt: number;
  startedAt: number;
  reason: string;
  linkId: string;
  client: { id: string; name: string; role: string; photoUrl: string | null; location: string | null };
}

let current: AssistSession | null = null;
const listeners = new Set<() => void>();

// Estas rotas usam sempre a conta do agente, mesmo durante uma sessão de ajuda
const PASS_THROUGH = ["/api/agent", "/api/auth", "/api/notifications", "/api/conversations", "/api/messages", "/api/chat"];

function emit() {
  listeners.forEach((l) => l());
}

export function getAssist(): AssistSession | null {
  return current;
}

export function setAssist(next: AssistSession | null) {
  current = next;
  emit();
}

export function clearAssist() {
  setAssist(null);
}

// Durante a sessão, os pedidos às telas do cliente levam o token da conta do cliente
let installed = false;
function installInterceptor() {
  if (installed) return;
  installed = true;

  const manager: any = (api as any).interceptors.request;
  const id = manager.use((config: any) => {
    const session = current;
    if (!session) return config;

    if (session.expiresAt <= Date.now()) {
      current = null;
      emit();
      return config;
    }

    const path = String(config.url ?? "").replace(/^https?:\/\/[^/]+/i, "");
    if (PASS_THROUGH.some((p) => path.startsWith(p))) return config;

    config.headers = config.headers ?? {};
    if (typeof config.headers.set === "function") config.headers.set("Authorization", `Bearer ${session.token}`);
    else config.headers.Authorization = `Bearer ${session.token}`;
    return config;
  });

  // Tem de ser o último a correr (depois do que põe o token do agente): fica no início da lista
  const handlers = manager.handlers;
  if (Array.isArray(handlers) && typeof id === "number" && id > 0 && handlers[id]) {
    const [mine] = handlers.splice(id, 1);
    handlers.unshift(mine);
  }
}

installInterceptor();

// Estado da sessão de ajuda numa tela, com o tempo que falta
export function useAssist() {
  const [, force] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const sessionId = current?.sessionId ?? null;
  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    if (current && now >= current.expiresAt) {
      current = null;
      emit();
    }
  }, [now]);

  return {
    session: current,
    remainingMs: current ? Math.max(0, current.expiresAt - now) : 0,
  };
}

export function timeText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
