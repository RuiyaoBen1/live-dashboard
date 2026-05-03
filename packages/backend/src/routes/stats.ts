import { db } from "../db";
import { getPanels, getDevicePanelId } from "../middleware/auth";

interface AppStat {
  name: string;
  minutes: number;
  percent: number;
}

// Display name mapping + dedup merge
const DISPLAY_NAMES: Record<string, string> = {
  // Lowercase keys — matched case-insensitively
  "idle": "空闲",
  "rdr2": "荒野大镖客2",
  "douyin": "抖音",
  "valorant-win64-shipping": "VALORANT",
  "r5apex_dx12": "Apex英雄",
  "client-win64-shipping": "游戏客户端",
};

function beautify(raw: string): string {
  return DISPLAY_NAMES[raw.toLowerCase()] ?? raw;
}

export function handleStats(url: URL): Response {
  const panelId = url.searchParams.get("panel_id") || "";
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "7") || 7));

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  let deviceIds: string[] = [];

  if (panelId) {
    const panels = getPanels();
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) {
      return Response.json({ error: "Panel not found" }, { status: 404 });
    }
    const rows = db.query("SELECT DISTINCT device_id FROM activities WHERE started_at >= ?").all(sinceISO) as { device_id: string }[];
    deviceIds = rows
      .map((r) => r.device_id)
      .filter((id) => getDevicePanelId(id) === panelId);
  } else {
    const rows = db.query("SELECT DISTINCT device_id FROM activities WHERE started_at >= ?").all(sinceISO) as { device_id: string }[];
    deviceIds = rows.map((r) => r.device_id);
  }

  if (deviceIds.length === 0) {
    return Response.json({ apps: [], totalActiveMinutes: 0, dateRange: formatDateRange(since, new Date()) });
  }

  const placeholders = deviceIds.map(() => "?").join(",");

  const query = `
    SELECT
      app_name,
      COUNT(DISTINCT device_id || '|' || time_bucket) AS bucket_count
    FROM activities
    WHERE device_id IN (${placeholders}) AND started_at >= ?
    GROUP BY app_name
    ORDER BY bucket_count DESC
  `;

  const rows = db.query(query).all(...deviceIds, sinceISO) as { app_name: string; bucket_count: number }[];

  // Beautify names + merge duplicates
  const merged = new Map<string, number>();
  for (const r of rows) {
    const name = beautify(r.app_name);
    const mins = Math.round((r.bucket_count * 10) / 60);
    merged.set(name, (merged.get(name) || 0) + mins);
  }

  const apps: AppStat[] = [...merged.entries()]
    .map(([name, minutes]) => ({ name, minutes, percent: 0 }))
    .sort((a, b) => b.minutes - a.minutes);

  const totalMinutes = apps.reduce((sum, a) => sum + a.minutes, 0);
  if (totalMinutes > 0) {
    apps.forEach((a) => {
      a.percent = Math.round((a.minutes / totalMinutes) * 100);
    });
  }

  // Merge tiny entries (< 2%) into "其他"
  const threshold = totalMinutes * 0.02;
  const main = apps.filter((a) => a.minutes >= threshold);
  const other = apps.filter((a) => a.minutes < threshold);
  if (other.length > 1) {
    const otherMinutes = other.reduce((s, a) => s + a.minutes, 0);
    main.push({
      name: "其他",
      minutes: otherMinutes,
      percent: totalMinutes > 0 ? Math.round((otherMinutes / totalMinutes) * 100) : 0,
    });
  } else if (other.length === 1) {
    main.push(other[0]);
  }

  return Response.json({
    apps: main,
    totalActiveMinutes: totalMinutes,
    dateRange: formatDateRange(since, new Date()),
  });
}

function formatDateRange(from: Date, to: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(from)} ~ ${fmt(to)}`;
}
