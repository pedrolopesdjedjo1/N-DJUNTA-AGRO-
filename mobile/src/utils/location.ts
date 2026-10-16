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

// Tenta descobrir a rua e a cidade a partir das coordenadas. Devolve null se não conseguir.
export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; region: string } | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const r: any = results && results[0];
    if (!r) return null;

    const street = [r.street ?? r.name, r.streetNumber].filter(Boolean).join(" ");
    const address = [street, r.district].filter(Boolean).join(", ") || [r.city, r.region].filter(Boolean).join(", ");
    const region = r.city ?? r.subregion ?? r.region ?? r.district ?? "";

    return { address, region };
  } catch (e) {
    return null;
  }
}

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
