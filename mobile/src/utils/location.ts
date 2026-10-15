import * as Location from "expo-location";

export interface Coords {
  lat: number;
  lng: number;
}

// Pede permissão e devolve a posição atual (ou a última conhecida). Devolve null se não conseguir.
export async function getPosition(): Promise<Coords | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000));
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      timeout,
    ]);

    if (position) {
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    }

    const last = await Location.getLastKnownPositionAsync();
    return last ? { lat: last.coords.latitude, lng: last.coords.longitude } : null;
  } catch (e) {
    return null;
  }
}

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
