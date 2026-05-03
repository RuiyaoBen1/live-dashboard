"use client";

import { useEffect, useState } from "react";
import { fetchWeather, type WeatherData, type WeatherLocation } from "@/lib/api";

function getAdvice(desc: string, temp: number): string {
  const d = desc.toLowerCase();
  if (d.includes("rain") || d.includes("雨")) return "记得带伞~";
  if (d.includes("snow") || d.includes("雪")) return "路滑注意安全";
  if (d.includes("fog") || d.includes("雾")) return "能见度低，慢行";
  if (temp >= 35) return "太热了，注意防暑";
  if (temp >= 28) return "天气较热，多喝水";
  if (temp <= 5) return "很冷，注意保暖";
  if (temp <= 10) return "有点冷，多穿点";
  return "适合出行~";
}

function getWeatherIcon(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("sun") || d.includes("clear") || d.includes("晴")) return "☀️";
  if (d.includes("cloud") || d.includes("阴") || d.includes("多云")) return "☁️";
  if (d.includes("rain") || d.includes("雨")) return "🌧️";
  if (d.includes("snow") || d.includes("雪")) return "❄️";
  if (d.includes("thunder") || d.includes("雷")) return "⛈️";
  if (d.includes("fog") || d.includes("雾")) return "🌫️";
  return "🌤️";
}

export default function WeatherCard({ location, isVisitor, visitorWeather: visitorWeatherProp }: { location?: WeatherLocation; isVisitor?: boolean; visitorWeather?: WeatherData | null }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isVisitor) return;
    if (!location) return;
    let active = true;
    const load = () => {
      fetchWeather(location.city)
        .then((data) => { if (active) { setWeather(data); setError(false); } })
        .catch(() => { if (active) setError(true); });
    };
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => { active = false; clearInterval(interval); };
  }, [location?.city, isVisitor]);

  const displayWeather = isVisitor ? (visitorWeatherProp ?? null) : weather;
  const temp = displayWeather ? parseFloat(displayWeather.temp_c) : 0;
  const label = isVisitor ? "你的所在地天气" : (location?.label ?? "");

  return (
    <div className={`vn-bubble p-3${isVisitor ? " border-[var(--color-primary)] border" : ""}`}>
      <p className="text-xs font-bold text-[var(--color-primary)] mb-1">
        {label} {isVisitor && <span className="text-[9px] bg-[var(--color-primary)] text-white px-1 py-0.5 rounded ml-1">📍</span>}
      </p>
      {isVisitor && displayWeather && (
        <p className="text-[10px] text-[var(--color-text-muted)] -mt-0.5 mb-1">
          {(displayWeather as any).label ?? ""}
        </p>
      )}
      {(isVisitor && !displayWeather) ? (
        <p className="text-[10px] text-[var(--color-text-muted)]">获取中...</p>
      ) : error ? (
        <p className="text-[10px] text-[var(--color-text-muted)]">获取失败</p>
      ) : !displayWeather ? (
        <p className="text-[10px] text-[var(--color-text-muted)]">加载中...</p>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-lg">{getWeatherIcon(displayWeather.weather_desc)}</span>
            <span className="text-sm font-bold">{displayWeather.temp_c}°C</span>
          </div>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {displayWeather.weather_desc} · 湿度 {displayWeather.humidity}%
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            体感 {displayWeather.feels_like_c}°C · 风速 {displayWeather.wind_kmph}km/h
          </p>
          <p className="text-[10px] text-[var(--color-primary)] mt-1">
            {getAdvice(displayWeather.weather_desc, temp)}
          </p>
        </>
      )}
    </div>
  );
}
