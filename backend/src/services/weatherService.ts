import { prisma } from "../lib/prisma";

interface Coord {
  name: string;
  lat: number;
  lng: number;
}

const REGIONS: Coord[] = [
  { name: "Bissau", lat: 11.8636, lng: -15.5977 },
  { name: "Bafatá", lat: 12.1667, lng: -14.6667 },
  { name: "Gabú", lat: 12.2833, lng: -14.2167 },
  { name: "Bolama", lat: 11.5833, lng: -15.4667 },
  { name: "Bubaque", lat: 11.2833, lng: -15.8333 },
  { name: "Cacheu", lat: 12.2667, lng: -16.1667 },
  { name: "Canchungo", lat: 12.0667, lng: -16.0333 },
  { name: "Farim", lat: 12.4833, lng: -15.2167 },
  { name: "Mansôa", lat: 12.0667, lng: -15.3167 },
  { name: "Bissorã", lat: 12.2167, lng: -15.45 },
  { name: "Quinhamel", lat: 11.8833, lng: -15.85 },
  { name: "Catió", lat: 11.2833, lng: -15.25 },
  { name: "Buba", lat: 11.5833, lng: -14.9833 },
];

const CACHE = new Map<string, { at: number; data: any }>();
const CACHE_MS = 30 * 60 * 1000;

function plain(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function listRegions() {
  return REGIONS.map((r) => r.name);
}

function resolveRegion(input?: string) {
  const key = input ? plain(input) : "";
  if (key) {
    const found = REGIONS.find((r) => {
      const name = plain(r.name);
      return name === key || key.includes(name) || name.includes(key);
    });
    if (found) return { coord: found, known: true };
  }
  return { coord: REGIONS[0], known: false };
}

function describe(code: number): string {
  if (code === 0) return "Céu limpo";
  if (code <= 3) return "Parcialmente nublado";
  if (code === 45 || code === 48) return "Nevoeiro";
  if (code >= 51 && code <= 57) return "Chuvisco";
  if (code >= 61 && code <= 67) return "Chuva";
  if (code >= 80 && code <= 82) return "Aguaceiros";
  if (code >= 95) return "Trovoada";
  return "Nublado";
}

async function fetchForecast(coord: Coord) {
  const cached = CACHE.get(coord.name);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const doFetch: any = (globalThis as any).fetch;
  const Controller: any = (globalThis as any).AbortController;
  const controller = new Controller();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${coord.lat}&longitude=${coord.lng}` +
      "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max" +
      "&timezone=auto&forecast_days=7";

    const response = await doFetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error("O serviço de previsão não respondeu.");
    }
    const data = await response.json();
    CACHE.set(coord.name, { at: Date.now(), data });
    return data;
  } catch (e) {
    if (cached) return cached.data;
    throw new Error("Não foi possível obter a previsão do tempo agora. Tente mais tarde.");
  } finally {
    clearTimeout(timer);
  }
}

function dayName(date: string) {
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  return names[new Date(`${date}T12:00:00`).getDay()];
}

export async function getForecast(userId: string, regionInput?: string) {
  let input = regionInput;
  if (!input) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { location: true } });
    input = user?.location ?? undefined;
  }

  const { coord, known } = resolveRegion(input);
  const raw = await fetchForecast(coord);
  const daily = raw?.daily ?? {};
  const times: string[] = daily.time ?? [];

  const days = times.map((date, i) => {
    const code = Number(daily.weather_code?.[i] ?? 0);
    return {
      date,
      weekday: dayName(date),
      code,
      description: describe(code),
      tmax: daily.temperature_2m_max?.[i] ?? null,
      tmin: daily.temperature_2m_min?.[i] ?? null,
      rain: Number(daily.precipitation_sum?.[i] ?? 0),
      rainProbability: Number(daily.precipitation_probability_max?.[i] ?? 0),
      wind: Number(daily.wind_speed_10m_max?.[i] ?? 0),
      gust: Number(daily.wind_gusts_10m_max?.[i] ?? 0),
      storm: code >= 95,
    };
  });

  const current = raw?.current
    ? {
        temperature: raw.current.temperature_2m,
        humidity: raw.current.relative_humidity_2m,
        wind: raw.current.wind_speed_10m,
        rain: raw.current.precipitation,
        description: describe(Number(raw.current.weather_code ?? 0)),
      }
    : null;

  const month = new Date().getMonth() + 1;
  const rainySeason = month >= 6 && month <= 10;
  const season = {
    name: rainySeason ? "Época das chuvas" : "Época seca",
    tip: rainySeason
      ? "É a época das chuvas: bom período para plantar. Evite colher e secar produtos em dias de chuva."
      : "É a época seca: bom período para colher, secar e conservar. As hortas precisam de rega.",
  };

  // Alertas gerados pela previsão
  const auto: { level: string; kind: string; title: string; detail: string; date: string }[] = [];
  days.forEach((d) => {
    if (d.storm) {
      auto.push({ level: "ALTA", kind: "METEOROLOGICO", title: "Tempestade prevista", detail: `Trovoada em ${d.weekday}. Proteja pessoas, animais e produtos.`, date: d.date });
    }
    if (d.rain >= 50) {
      auto.push({ level: "ALTA", kind: "METEOROLOGICO", title: "Chuva muito forte", detail: `Cerca de ${Math.round(d.rain)} mm em ${d.weekday}.`, date: d.date });
    } else if (d.rain >= 25) {
      auto.push({ level: "MEDIA", kind: "METEOROLOGICO", title: "Chuva forte", detail: `Cerca de ${Math.round(d.rain)} mm em ${d.weekday}.`, date: d.date });
    }
    if (d.gust >= 60) {
      auto.push({ level: "ALTA", kind: "METEOROLOGICO", title: "Vento forte", detail: `Rajadas de ${Math.round(d.gust)} km/h em ${d.weekday}.`, date: d.date });
    } else if (d.gust >= 45) {
      auto.push({ level: "MEDIA", kind: "METEOROLOGICO", title: "Vento moderado a forte", detail: `Rajadas de ${Math.round(d.gust)} km/h em ${d.weekday}.`, date: d.date });
    }
    if (d.tmax !== null && d.tmax >= 38) {
      auto.push({ level: "MEDIA", kind: "METEOROLOGICO", title: "Calor intenso", detail: `Máxima de ${Math.round(d.tmax)} °C em ${d.weekday}.`, date: d.date });
    }
  });

  const firstHeavy = days.find((d) => d.rain >= 25 || d.storm);
  if (firstHeavy) {
    auto.push({ level: "ALTA", kind: "AGRICOLA", title: "Proteja a colheita", detail: `Chuva forte prevista para ${firstHeavy.weekday}. Guarde os produtos colhidos em local seco.`, date: firstHeavy.date });
  }

  const totalRain = days.reduce((s, d) => s + d.rain, 0);
  if (rainySeason && days.length > 0 && totalRain < 2) {
    auto.push({ level: "MEDIA", kind: "AGRICOLA", title: "Pouca chuva prevista", detail: "Quase não há chuva nos próximos 7 dias na época das chuvas. Atenção à rega.", date: days[0].date });
  }

  // Melhores dias para plantar e colher
  const plantingDays = days
    .filter((d) => d.rain >= 3 && d.rain <= 40 && !d.storm && d.gust < 50)
    .map((d) => ({ date: d.date, weekday: d.weekday, reason: `Chuva moderada (${Math.round(d.rain)} mm) ajuda a terra a ficar húmida.` }));

  const harvestDays = days
    .filter((d) => d.rain < 1 && d.rainProbability < 40 && !d.storm && d.gust < 45)
    .map((d) => ({ date: d.date, weekday: d.weekday, reason: "Dia seco e com pouco vento, bom para colher e secar." }));

  // Alertas registados pela equipa
  const now = new Date();
  const dbAlerts = await prisma.weatherAlert.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      AND: [{ region: { contains: coord.name, mode: "insensitive" } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    region: coord.name,
    known,
    current,
    days,
    season,
    alerts: {
      auto,
      weather: dbAlerts.filter((a) => a.type === "CHUVA" || a.type === "SECA"),
      agricultural: dbAlerts.filter((a) => a.type === "PRAGA" || a.type === "OUTRO"),
    },
    advice: { plantingDays, harvestDays },
  };
}
