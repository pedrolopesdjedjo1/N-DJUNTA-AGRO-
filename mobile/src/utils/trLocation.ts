import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

export interface Pos {
  lat: number;
  lng: number;
}

// Onde o transportador está agora. Só pede a permissão quando "ask" é verdadeiro.
export async function getPosition(ask = true): Promise<Pos | null> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      if (!ask) return null;
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (perm.status !== "granted") return null;

    const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: cur.coords.latitude, lng: cur.coords.longitude };
  } catch (error) {
    return null;
  }
}

// A permissão está dada?
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    return perm.status === "granted";
  } catch (error) {
    return false;
  }
}

// A posição fica guardada na tela, e só pede a permissão se "autoAsk" for verdadeiro
export function useMyPosition(autoAsk = false) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (ask = true) => {
    setLoading(true);
    const p = await getPosition(ask);
    setPos(p);
    setLoading(false);
    return p;
  }, []);

  useEffect(() => {
    refresh(autoAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pos, loading, refresh };
}
