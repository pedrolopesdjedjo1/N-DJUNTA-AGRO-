import { api } from "./client";

export async function getTransports() {
  const response = await api.get("/api/transport");
  return (
    response.data.transports ||
    response.data.transport ||
    response.data.offers ||
    response.data ||
    []
  );
}
