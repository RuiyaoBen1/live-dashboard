const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const geoCache = new Map<string, { city: string; label: string; fetchedAt: number }>();
const weatherCache = new Map<string, { data: unknown; fetchedAt: number }>();

function extractIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return "";
}

async function resolveCity(ip: string): Promise<{ city: string; label: string } | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return null;
  }

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.fetchedAt < GEO_CACHE_TTL) {
    return { city: cached.city, label: cached.label };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`https://api.ip.sb/geoip/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { "User-Agent": "live-dashboard/1.0" },
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json() as { city?: string; region?: string; country?: string };
    const city = data.city || data.region || data.country || null;
    if (!city) return null;
    const label = [data.city, data.region].filter(Boolean).join(" · ") || city;
    geoCache.set(ip, { city, label, fetchedAt: Date.now() });
    return { city, label };
  } catch {
    return null;
  }
}

async function fetchWeatherForCity(city: string, label: string): Promise<Record<string, unknown> | null> {
  const cached = weatherCache.get(city);
  if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL) {
    return cached.data as Record<string, unknown>;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      headers: { "User-Agent": "live-dashboard/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;

    const raw = await resp.json() as Record<string, unknown>;
    const current = (raw as any)?.current_condition?.[0];
    if (!current) return null;

    const data = {
      city,
      label,
      temp_c: current.temp_C,
      humidity: current.humidity,
      weather_desc: current.weatherDesc?.[0]?.value ?? "",
      feels_like_c: current.FeelsLikeC,
      wind_kmph: current.windspeedKmph,
      visibility: current.visibility,
    };

    weatherCache.set(city, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}

export async function handleVisitorWeather(req: Request): Promise<Response> {
  const ip = extractIp(req);

  if (!ip) {
    return Response.json({ weather: null }, { status: 200 });
  }

  const location = await resolveCity(ip);
  if (!location) {
    return Response.json({ weather: null, ip }, { status: 200 });
  }

  const weather = await fetchWeatherForCity(location.city, location.label);
  if (!weather) {
    return Response.json({ weather: null, city: location.city }, { status: 200 });
  }

  return Response.json({ weather });
}
