import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getShopFavorites, toggleFavoriteProduct } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";

// Guarda quais produtos estão nos favoritos e permite ligar e desligar o coração
export function useFavoriteIds() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getShopFavorites()
        .then((data: any) => {
          if (alive) setIds(new Set((data.products ?? []).map((p: any) => p.id)));
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [])
  );

  const flip = (productId: string, on: boolean) =>
    setIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(productId);
      else next.delete(productId);
      return next;
    });

  async function toggle(productId: string) {
    const was = ids.has(productId);
    flip(productId, !was);
    try {
      await toggleFavoriteProduct(productId);
    } catch (e) {
      flip(productId, was);
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar os favoritos."));
    }
  }

  return { ids, toggle };
}
