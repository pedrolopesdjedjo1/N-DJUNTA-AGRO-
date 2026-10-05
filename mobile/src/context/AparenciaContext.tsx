// mobile/src/context/AparenciaContext.tsx
// Funcionalidades 80 (modo escuro), 96 (modo vendedor/comprador) e 100 (modo acessível).
// Guarda as escolhas no aparelho. Se o provider não estiver ligado, as telas usam os valores padrão.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE = '@nodjuntaagro:aparencia';

export type Aparencia = {
  escuro: boolean;
  letrasGrandes: boolean;
  altoContraste: boolean;
  leituraVoz: boolean;
  modo: 'vendedor' | 'comprador';
};

const PADRAO: Aparencia = { escuro: false, letrasGrandes: false, altoContraste: false, leituraVoz: false, modo: 'vendedor' };

type Ctx = Aparencia & { mudar: (parcial: Partial<Aparencia>) => void; escala: number; cores: Cores };
export type Cores = { fundo: string; texto: string; suave: string; card: string; borda: string; verde: string; aviso: string };

export function coresDe(a: Aparencia): Cores {
  if (a.altoContraste) {
    return a.escuro
      ? { fundo: '#000', texto: '#fff', suave: '#ddd', card: '#111', borda: '#fff', verde: '#00e676', aviso: '#ffd600' }
      : { fundo: '#fff', texto: '#000', suave: '#222', card: '#fff', borda: '#000', verde: '#1b5e20', aviso: '#ffd600' };
  }
  return a.escuro
    ? { fundo: '#121212', texto: '#eeeeee', suave: '#aaaaaa', card: '#1e1e1e', borda: '#333333', verde: '#66bb6a', aviso: '#4a3f00' }
    : { fundo: '#ffffff', texto: '#222222', suave: '#666666', card: '#fafafa', borda: '#e0e0e0', verde: '#2e7d32', aviso: '#fff3cd' };
}

const valorPadrao: Ctx = { ...PADRAO, mudar: () => {}, escala: 1, cores: coresDe(PADRAO) };
const AparenciaCtx = createContext<Ctx>(valorPadrao);

export function AparenciaProvider({ children }: { children: React.ReactNode }) {
  const [a, setA] = useState<Aparencia>(PADRAO);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE).then((v) => {
      if (v) setA({ ...PADRAO, ...JSON.parse(v) });
    });
  }, []);

  const mudar = useCallback((parcial: Partial<Aparencia>) => {
    setA((atual) => {
      const novo = { ...atual, ...parcial };
      AsyncStorage.setItem(CHAVE, JSON.stringify(novo));
      return novo;
    });
  }, []);

  const valor: Ctx = { ...a, mudar, escala: a.letrasGrandes ? 1.3 : 1, cores: coresDe(a) };
  return <AparenciaCtx.Provider value={valor}>{children}</AparenciaCtx.Provider>;
}

export const useAparencia = () => useContext(AparenciaCtx);
