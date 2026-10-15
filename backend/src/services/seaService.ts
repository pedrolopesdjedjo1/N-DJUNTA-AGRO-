import { prisma } from "../lib/prisma";

interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  regions: string[];
}

// Pontos de referência ao largo da costa (mar aberto), não são portos
export const ZONES: Zone[] = [
  { id: "norte", name: "Norte (Cacheu e Varela)", lat: 12.3, lng: -17.1, regions: ["Cacheu", "Canchungo", "Varela", "Farim"] },
  { id: "centro", name: "Centro (Bissau e Geba)", lat: 11.85, lng: -17.0, regions: ["Bissau", "Quinhamel", "Mansôa", "Bissorã"] },
  { id: "bijagos", name: "Bijagós (oeste)", lat: 11.3, lng: -16.95, regions: ["Bubaque", "Bolama", "Bijagós"] },
  { id: "sul", name: "Sul (Cacine e Tombali)", lat: 10.55, lng: -16.0, regions: ["Catió", "Buba", "Cacine", "Tombali"] },
];

const CACHE = new Map<string, { at: number; data: any }>();
const CACHE_MS = 30 * 60 * 1000;
const RANK = { SEGURO: 0, ATENCAO: 1, PERIGOSO: 2 } as const;
type Level = keyof typeof RANK;
type Extreme = { time: string; level: number } | null;

const NOTICE =
  "Dados de modelos (Open-Meteo) para um ponto de referência ao largo. São uma orientação e não substituem o seu conhecimento do mar, os avisos das autoridades nem o bom senso. Os limites são para embarcações pequenas.";

function plain(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function num(value: any): number | null {
  return typeof value === "number" && !isNaN(value) ? value : null;
}

function round1(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function compass(deg: number | null): string | null {
  if (deg === null) return null;
  const names = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return names[Math.round(deg / 45) % 8];
}

function dayName(date: string) {
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  return names[new Date(`${date}T12:00:00`).getDay()];
}

function maxOf(list: any[]): number | null {
  const values = list.filter((v) => typeof v === "number" && !isNaN(v)) as number[];
  return values.length ? Math.max(...values) : null;
}

async function getJson(key: string, url: string) {
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const doFetch: any = (globalThis as any).fetch;
  const Controller: any = (globalThis as any).AbortController;
  const controller = new Controller();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await doFetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Resposta inválida do serviço.");
    const data = await response.json();
    CACHE.set(key, { at: Date.now(), data });
    return data;
  } catch (e) {
    return cached ? cached.data : null;
  } finally {
    clearTimeout(timer);
  }
}

function fetchMarine(zone: Zone) {
  const url =
    "https://marine-api.open-meteo.com/v1/marine" +
    `?latitude=${zone.lat}&longitude=${zone.lng}` +
    "&current=wave_height,wave_direction,wave_period" +
    "&hourly=wave_height" +
    "&daily=wave_height_max,wave_direction_dominant,wave_period_max" +
    "&timezone=auto&forecast_days=7";
  return getJson(`marine:${zone.id}`, url);
}

function fetchMarineExtra(zone: Zone) {
  const url =
    "https://marine-api.open-meteo.com/v1/marine" +
    `?latitude=${zone.lat}&longitude=${zone.lng}` +
    "&hourly=sea_surface_temperature,sea_level_height_msl" +
    "&timezone=auto&forecast_days=3";
  return getJson(`marinex:${zone.id}`, url);
}

function fetchWind(zone: Zone) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${zone.lat}&longitude=${zone.lng}` +
    "&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code" +
    "&hourly=wind_speed_10m,wind_gusts_10m" +
    "&daily=weather_code,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,precipitation_sum" +
    "&timezone=auto&forecast_days=7";
  return getJson(`wind:${zone.id}`, url);
}

function assess(wave: number | null, wind: number | null, gust: number | null, storm: boolean) {
  const reasons: string[] = [];
  let level: Level = "SEGURO";

  const raise = (to: Level, reason: string) => {
    reasons.push(reason);
    if (RANK[to] > RANK[level]) level = to;
  };

  if (storm) raise("PERIGOSO", "Trovoada ou tempestade prevista.");

  if (wave !== null) {
    if (wave >= 1.5) raise("PERIGOSO", `Ondas altas (${wave.toFixed(1)} m).`);
    else if (wave >= 0.8) raise("ATENCAO", `Ondas moderadas (${wave.toFixed(1)} m).`);
  }
  if (wind !== null) {
    if (wind >= 30) raise("PERIGOSO", `Vento forte (${Math.round(wind)} km/h).`);
    else if (wind >= 20) raise("ATENCAO", `Vento moderado (${Math.round(wind)} km/h).`);
  }
  if (gust !== null) {
    if (gust >= 50) raise("PERIGOSO", `Rajadas fortes (${Math.round(gust)} km/h).`);
    else if (gust >= 35) raise("ATENCAO", `Rajadas moderadas (${Math.round(gust)} km/h).`);
  }

  if (reasons.length === 0) {
    reasons.push("Ondas e vento dentro dos limites para embarcações pequenas.");
  }

  const advice =
    level === "SEGURO"
      ? "Boas condições. Mesmo assim, avise alguém da hora de saída e de regresso e leve colete salva-vidas."
      : level === "ATENCAO"
      ? "Tenha cuidado. Embarcações pequenas devem ficar perto da costa e voltar cedo."
      : "Não é recomendado sair para o mar. Espere melhores condições.";

  return { level, reasons, advice };
}

function analyseTide(times: string[], levels: any[], nowKey: string) {
  const values = levels.map((v) => num(v));
  if (!values.some((v) => v !== null)) return null;

  let start = nowKey ? times.findIndex((t) => t >= nowKey) : 0;
  if (start < 0) start = 0;

  const here = values[start] ?? null;
  const next = values[start + 1] ?? null;

  let trend: "ENCHENTE" | "VAZANTE" | "PARADA" | null = null;
  if (here !== null && next !== null) {
    const diff = next - here;
    trend = diff > 0.02 ? "ENCHENTE" : diff < -0.02 ? "VAZANTE" : "PARADA";
  }

  let nextHigh: Extreme = null;
  let nextLow: Extreme = null;

  for (let i = Math.max(1, start); i < values.length - 1; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    const nxt = values[i + 1];
    if (prev === null || cur === null || nxt === null) continue;

    if (!nextHigh && cur >= prev && cur > nxt) {
      nextHigh = { time: times[i], level: Math.round(cur * 100) / 100 };
    }
    if (!nextLow && cur <= prev && cur < nxt) {
      nextLow = { time: times[i], level: Math.round(cur * 100) / 100 };
    }
    if (nextHigh && nextLow) break;
  }

  return {
    trend,
    level: here === null ? null : Math.round(here * 100) / 100,
    nextHigh,
    nextLow,
    note: "Valores aproximados do modelo. Na costa e nos rios a maré real pode ser diferente: confirme com os pescadores locais.",
  };
}

async function resolveZone(userId: string, zoneId?: string) {
  const byId = zoneId ? ZONES.find((z) => z.id === zoneId) : undefined;
  if (byId) return byId;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { location: true } });
  const loc = user?.location ? plain(user.location) : "";
  if (loc.length >= 3) {
    const found = ZONES.find((z) => z.regions.some((r) => loc.includes(plain(r)) || plain(r).includes(loc)));
    if (found) return found;
  }
  return ZONES[1];
}

export async function getConditions(userId: string, zoneId?: string) {
  const zone = await resolveZone(userId, zoneId);

  const [marine, extra, wind] = await Promise.all([fetchMarine(zone), fetchMarineExtra(zone), fetchWind(zone)]);
  if (!marine && !wind) {
    throw new Error("Não foi possível obter as condições do mar agora. Tente mais tarde.");
  }

  const nowTime: string = marine?.current?.time ?? wind?.current?.time ?? "";
  const nowKey = nowTime ? `${nowTime.slice(0, 13)}:00` : "";

  // Agora
  const waveNow = num(marine?.current?.wave_height);
  const wavePeriod = num(marine?.current?.wave_period);
  const waveDir = num(marine?.current?.wave_direction);
  const windNow = num(wind?.current?.wind_speed_10m);
  const gustNow = num(wind?.current?.wind_gusts_10m);
  const windDir = num(wind?.current?.wind_direction_10m);
  const codeNow = num(wind?.current?.weather_code) ?? 0;

  // Próximas 12 horas
  const mTimes: string[] = marine?.hourly?.time ?? [];
  let mStart = nowKey ? mTimes.findIndex((t) => t >= nowKey) : 0;
  if (mStart < 0) mStart = 0;
  const wave12 = maxOf((marine?.hourly?.wave_height ?? []).slice(mStart, mStart + 12));

  const wTimes: string[] = wind?.hourly?.time ?? [];
  let wStart = nowKey ? wTimes.findIndex((t) => t >= nowKey) : 0;
  if (wStart < 0) wStart = 0;
  const wind12 = maxOf((wind?.hourly?.wind_speed_10m ?? []).slice(wStart, wStart + 12));
  const gust12 = maxOf((wind?.hourly?.wind_gusts_10m ?? []).slice(wStart, wStart + 12));

  const stormToday = codeNow >= 95 || (num(wind?.daily?.weather_code?.[0]) ?? 0) >= 95;
  const assessment = assess(wave12 ?? waveNow, wind12 ?? windNow, gust12 ?? gustNow, stormToday);

  // Previsão marítima
  const dTimes: string[] = wind?.daily?.time ?? marine?.daily?.time ?? [];
  const days = dTimes.map((date, i) => {
    const mi: number = marine?.daily?.time ? marine.daily.time.indexOf(date) : -1;
    const wi: number = wind?.daily?.time ? wind.daily.time.indexOf(date) : -1;

    const waveMax = mi >= 0 ? num(marine.daily.wave_height_max?.[mi]) : null;
    const periodMax = mi >= 0 ? num(marine.daily.wave_period_max?.[mi]) : null;
    const waveFrom = mi >= 0 ? num(marine.daily.wave_direction_dominant?.[mi]) : null;
    const windMax = wi >= 0 ? num(wind.daily.wind_speed_10m_max?.[wi]) : null;
    const gustMax = wi >= 0 ? num(wind.daily.wind_gusts_10m_max?.[wi]) : null;
    const windFrom = wi >= 0 ? num(wind.daily.wind_direction_10m_dominant?.[wi]) : null;
    const rain = wi >= 0 ? num(wind.daily.precipitation_sum?.[wi]) ?? 0 : 0;
    const storm = wi >= 0 ? (num(wind.daily.weather_code?.[wi]) ?? 0) >= 95 : false;

    return {
      date,
      weekday: dayName(date),
      waveMax: round1(waveMax),
      wavePeriodMax: round1(periodMax),
      waveFrom: compass(waveFrom),
      windMax: windMax === null ? null : Math.round(windMax),
      gustMax: gustMax === null ? null : Math.round(gustMax),
      windFrom: compass(windFrom),
      rain: Math.round(rain),
      storm,
      assessment: assess(waveMax, windMax, gustMax, storm),
      _index: i,
    };
  });

  // Alertas de mau tempo (próximos 3 dias)
  const auto: { level: string; title: string; detail: string; date: string }[] = [];
  days.slice(0, 3).forEach((d) => {
    if (d.storm) {
      auto.push({ level: "ALTA", title: "Tempestade prevista", detail: `Trovoada em ${d.weekday}. Fique em terra.`, date: d.date });
    }
    if (d.waveMax !== null && d.waveMax >= 2.5) {
      auto.push({ level: "ALTA", title: "Ondas muito altas", detail: `Até ${d.waveMax} m em ${d.weekday}.`, date: d.date });
    } else if (d.waveMax !== null && d.waveMax >= 1.5) {
      auto.push({ level: "MEDIA", title: "Ondas altas", detail: `Até ${d.waveMax} m em ${d.weekday}.`, date: d.date });
    }
    if (d.gustMax !== null && d.gustMax >= 60) {
      auto.push({ level: "ALTA", title: "Vento muito forte", detail: `Rajadas de ${d.gustMax} km/h em ${d.weekday}.`, date: d.date });
    } else if (d.gustMax !== null && d.gustMax >= 45) {
      auto.push({ level: "MEDIA", title: "Vento forte", detail: `Rajadas de ${d.gustMax} km/h em ${d.weekday}.`, date: d.date });
    }
  });

  const dbWhere: any = {
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      { OR: zone.regions.map((r) => ({ region: { contains: r, mode: "insensitive" } })) },
    ],
  };
  const team = await prisma.weatherAlert.findMany({ where: dbWhere, orderBy: { createdAt: "desc" }, take: 20 });

  // Maré e temperatura da água
  const eTimes: string[] = extra?.hourly?.time ?? [];
  let eStart = nowKey ? eTimes.findIndex((t) => t >= nowKey) : 0;
  if (eStart < 0) eStart = 0;
  const seaTemperature = num(extra?.hourly?.sea_surface_temperature?.[eStart]);
  const tide = extra ? analyseTide(eTimes, extra.hourly?.sea_level_height_msl ?? [], nowKey) : null;

  return {
    zone: { id: zone.id, name: zone.name, lat: zone.lat, lng: zone.lng },
    zones: ZONES.map((z) => ({ id: z.id, name: z.name })),
    updatedAt: nowTime || null,
    current: {
      waveHeight: round1(waveNow),
      wavePeriod: round1(wavePeriod),
      waveFrom: compass(waveDir),
      wind: windNow === null ? null : Math.round(windNow),
      gust: gustNow === null ? null : Math.round(gustNow),
      windFrom: compass(windDir),
      seaTemperature: round1(seaTemperature),
    },
    next12h: {
      maxWave: round1(wave12),
      maxWind: wind12 === null ? null : Math.round(wind12),
      maxGust: gust12 === null ? null : Math.round(gust12),
    },
    assessment,
    tide,
    days: days.map(({ _index, ...rest }) => rest),
    alerts: { auto, team },
    available: { waves: !!marine, wind: !!wind, tide: !!tide, seaTemperature: seaTemperature !== null },
    notice: NOTICE,
  };
}

export async function getZones() {
  const result = await Promise.all(
    ZONES.map(async (zone) => {
      const [marine, wind] = await Promise.all([fetchMarine(zone), fetchWind(zone)]);
      const wave = num(marine?.current?.wave_height);
      const speed = num(wind?.current?.wind_speed_10m);
      const gust = num(wind?.current?.wind_gusts_10m);
      const storm = (num(wind?.current?.weather_code) ?? 0) >= 95;

      if (!marine && !wind) {
        return { id: zone.id, name: zone.name, lat: zone.lat, lng: zone.lng, regions: zone.regions, available: false };
      }

      const a = assess(wave, speed, gust, storm);
      return {
        id: zone.id,
        name: zone.name,
        lat: zone.lat,
        lng: zone.lng,
        regions: zone.regions,
        available: true,
        waveHeight: round1(wave),
        wind: speed === null ? null : Math.round(speed),
        gust: gust === null ? null : Math.round(gust),
        level: a.level,
        reasons: a.reasons,
      };
    })
  );

  return { zones: result, notice: NOTICE };
}
