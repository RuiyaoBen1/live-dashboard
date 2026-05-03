const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, { data: unknown; fetchedAt: number }>();

export async function handleWeather(url: URL): Promise<Response> {
  const city = url.searchParams.get("city");
  if (!city) {
    return Response.json({ error: "Missing city parameter" }, { status: 400 });
  }

  const cached = weatherCache.get(city);
  if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const resp = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      headers: { "User-Agent": "live-dashboard/1.0" },
    });
    if (!resp.ok) {
      return Response.json({ error: `Weather API error: ${resp.status}` }, { status: 502 });
    }

    const raw = await resp.json() as Record<string, unknown>;
    const current = (raw as any)?.current_condition?.[0];
    if (!current) {
      return Response.json({ error: "No weather data" }, { status: 502 });
    }

    const data = {
      city,
      temp_c: current.temp_C,
      humidity: current.humidity,
      weather_desc: current.weatherDesc?.[0]?.value ?? "",
      feels_like_c: current.FeelsLikeC,
      wind_kmph: current.windspeedKmph,
      visibility: current.visibility,
    };

    weatherCache.set(city, { data, fetchedAt: Date.now() });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Failed to fetch weather" }, { status: 502 });
  }
}

export function getWeatherLocations(): { panel_id: string; city: string; label: string }[] {
  try {
    return JSON.parse(process.env.WEATHER_LOCATIONS || "[]");
  } catch {
    return [];
  }
}
