import { api } from "./client";
import { cleanParams } from "./products";

export async function getSeaConditions(zone?: string) {
  return (await api.get("/api/sea/conditions", { params: cleanParams({ zone }) })).data;
}

export async function getSeaZones() {
  return (await api.get("/api/sea/zones")).data;
}
