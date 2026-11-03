import { useEffect } from "react";
import { Platform } from "react-native";
import { pingDevice } from "../api/transporterV2";
import { getDeviceId } from "../utils/deviceId";

// Não mostra nada. Coloque-o uma vez dentro da parte do app a que só entram pessoas com sessão aberta.
// Avisa a conta de que este aparelho a está a usar (e a pessoa é avisada se for um aparelho novo).
export default function DevicePing() {
  useEffect(() => {
    let alive = true;

    (async () => {
      const deviceId = await getDeviceId();
      if (!deviceId || !alive) return;

      try {
        await pingDevice({
          deviceId,
          platform: Platform.OS,
          label: Platform.OS === "ios" ? "iPhone" : Platform.OS === "android" ? "Telemóvel Android" : "Navegador",
        });
      } catch (error) {
        // se falhar, tenta na próxima vez que o app abrir
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return null;
}
