import { db } from "../db";
import { getPanels, getDevicePanelId } from "../middleware/auth";

const DISPLAY_NAMES: Record<string, string> = {
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

interface SummaryContext {
  deviceCount: number;
  onlineCount: number;
  activeHours: number;
  topApp: string;
  topMusicApp: string;
  musicMinutes: number;
}

const musicApps = new Set([
  "Spotify", "QQ音乐", "网易云音乐", "酷狗音乐",
  "Apple Music", "foobar2000", "YouTube Music", "酷我音乐",
  "Amazon Music", "AIMP",
]);

type TemplateFn = (name: string, c: SummaryContext) => string;

const templates: TemplateFn[] = [
  (name, c) => {
    if (c.topMusicApp && c.musicMinutes > 30) {
      return `${name} 今天听了 ${c.musicMinutes} 分钟音乐，最常听 ${c.topMusicApp} 🎵`;
    }
    return "";
  },
  (name, c) => `${name} 今天活跃了 ${c.activeHours} 小时，最常用 ${c.topApp} ✨`,
  (name, c) => `${name} 的 ${c.onlineCount}/${c.deviceCount} 台设备在线，正在用 ${c.topApp}`,
  (name, c) => `${name} 今天的主要时间花在 ${c.topApp} 上 📊`,
];

export function handlePanelSummary(url: URL): Response {
  const panelId = url.searchParams.get("panel_id")?.trim();
  if (!panelId) {
    return Response.json({ error: "panel_id required" }, { status: 400 });
  }

  const panels = getPanels();
  const panel = panels.find((p) => p.id === panelId);
  if (!panel) {
    return Response.json({ error: "Panel not found" }, { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const allDeviceRows = db.query("SELECT DISTINCT device_id FROM activities WHERE started_at >= ?").all(todayISO) as { device_id: string }[];
  const panelDevices = allDeviceRows
    .map((r) => r.device_id)
    .filter((id) => getDevicePanelId(id) === panelId);

  const deviceCount = panelDevices.length;
  if (deviceCount === 0) {
    return Response.json({ summary: `${panel.name} 暂无设备活动` });
  }

  const onlinePl = panelDevices.map(() => "?").join(",");
  const onlineRows = db.query(
    `SELECT COUNT(*) as cnt FROM device_states WHERE device_id IN (${onlinePl}) AND is_online = 1`
  ).all(...panelDevices) as { cnt: number }[];
  const onlineCount = onlineRows[0]?.cnt ?? 0;

  const devPl = panelDevices.map(() => "?").join(",");
  const statsRows = db.query(`
    SELECT
      app_name,
      COUNT(DISTINCT device_id || '|' || time_bucket) AS bucket_count
    FROM activities
    WHERE device_id IN (${devPl}) AND started_at >= ?
    GROUP BY app_name
    ORDER BY bucket_count DESC
  `).all(...panelDevices, todayISO) as { app_name: string; bucket_count: number }[];

  const totalBuckets = statsRows.reduce((s, r) => s + r.bucket_count, 0);
  const activeHours = Math.round((totalBuckets * 10) / 3600 * 10) / 10;
  const topApp = beautify(statsRows[0]?.app_name ?? "—");

  const musicStats = statsRows.filter((r) => musicApps.has(r.app_name));
  const musicBuckets = musicStats.reduce((s, r) => s + r.bucket_count, 0);
  const musicMinutes = Math.round((musicBuckets * 10) / 60);
  const topMusicApp = beautify(musicStats[0]?.app_name ?? "");

  const ctx: SummaryContext = {
    deviceCount,
    onlineCount,
    activeHours: activeHours || 0.1,
    topApp,
    topMusicApp,
    musicMinutes,
  };

  let summary = "";
  for (const t of templates) {
    summary = t(panel.name, ctx);
    if (summary) break;
  }

  return Response.json({ summary });
}
