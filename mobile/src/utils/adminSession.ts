import { useEffect, useState } from "react";
import { api } from "../api/client";
import { getBoMe } from "../api/backoffice";

export type AdminBlock = "" | "SESSION" | "SETUP" | "NOT_ADMIN" | "SUSPENDED";

interface State {
  token: string | null;
  expiresAt: number;
  blocked: AdminBlock;
}

let state: State = { token: null, expiresAt: 0, blocked: "" };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// Guarda a sessão de administrador só na memória: ao fechar o app, pede-se o código de novo
export function setAdminSession(token: string, expiresAt: number | string | Date) {
  state = { token, expiresAt: new Date(expiresAt).getTime(), blocked: "" };
  emit();
}

export function clearAdminSession() {
  state = { ...state, token: null, expiresAt: 0 };
  emit();
}

export function setAdminBlocked(blocked: AdminBlock) {
  state = { ...state, blocked };
  emit();
}

export function getAdminToken(): string | null {
  return state.token && state.expiresAt > Date.now() ? state.token : null;
}

// ---------- Quem sou eu como administrador (guardado enquanto a tela está aberta) ----------
let meCache: any = null;
let mePending: Promise<any> | null = null;

export function forgetAdminMe() {
  meCache = null;
  mePending = null;
}

export function getAdminMeCache(): any {
  return meCache;
}

export function loadAdminMe(): Promise<any> {
  if (meCache) return Promise.resolve(meCache);
  if (!mePending) {
    mePending = getBoMe()
      .then((me: any) => {
        meCache = me;
        return me;
      })
      .finally(() => {
        mePending = null;
      });
  }
  return mePending;
}

// Diz se este administrador tem pelo menos uma destas permissões
export function adminCan(...perms: string[]): boolean {
  const list: string[] = meCache?.permissions ?? [];
  return perms.length === 0 || perms.some((p) => list.includes(p));
}

export function useAdminSession() {
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { blocked: state.blocked, hasSession: !!getAdminToken(), expiresAt: state.expiresAt };
}

// Leva o código da sessão em todos os pedidos da administração e reconhece quando ela falta
let installed = false;

function install() {
  if (installed) return;
  installed = true;

  (api as any).interceptors.request.use((config: any) => {
    const token = getAdminToken();
    if (token && String(config.url ?? "").includes("/api/backoffice")) {
      config.headers = config.headers ?? {};
      if (typeof config.headers.set === "function") config.headers.set("X-Admin-Session", token);
      else config.headers["X-Admin-Session"] = token;
    }
    return config;
  });

  (api as any).interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;

      if (status === 403 && typeof code === "string") {
        if (code === "ADMIN_SESSION_REQUIRED") {
          clearAdminSession();
          setAdminBlocked("SESSION");
        } else if (code === "ADMIN_2FA_REQUIRED") setAdminBlocked("SETUP");
        else if (code === "NOT_ADMIN") setAdminBlocked("NOT_ADMIN");
        else if (code === "ADMIN_SUSPENDED") setAdminBlocked("SUSPENDED");
      }
      return Promise.reject(error);
    }
  );
}

install();
