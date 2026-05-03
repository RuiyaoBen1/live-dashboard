"use client";

import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useConfig } from "@/hooks/useConfig";
import { fetchStats } from "@/lib/api";
import type { AppStat } from "@/lib/api";

const COLORS = [
  "#E8A0BF", "#88C9C9", "#E8B86D", "#C4A4D4", "#7EC8A0",
  "#F0A880", "#80B0D4", "#D4A080", "#A0C8D0", "#C8B080",
  "#8BB8A8", "#D4B8A0", "#A8C0D8", "#C0A8C8",
];

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function CustomPieLabel({ cx, cy, midAngle, outerRadius, name, percent }: any) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="fill-[var(--color-text)] text-[11px]"
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

export default function StatsOverlay() {
  const config = useConfig();
  const panels = config.panels;

  const [open, setOpen] = useState(false);
  const [panelId, setPanelId] = useState("");
  const [days, setDays] = useState(7);
  const [apps, setApps] = useState<AppStat[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [dateRange, setDateRange] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStats(panelId, days);
      setApps(data.apps);
      setTotalMinutes(data.totalActiveMinutes);
      setDateRange(data.dateRange);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [panelId, days]);

  useEffect(() => {
    if (open) loadStats();
  }, [open, loadStats]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (panels.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-28 z-40 w-12 h-12 rounded-full bg-[var(--color-card)]/95 backdrop-blur-md border-2 border-[var(--color-border)] shadow-lg flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition-transform lg:right-6 lg:bottom-6"
        title="应用统计"
      >
        📊
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="bg-[var(--color-card)] rounded-2xl border-2 border-[var(--color-border)] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 stats-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">应用使用统计</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <select
                value={panelId}
                onChange={(e) => setPanelId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-cream)] border border-[var(--color-border)] text-sm text-[var(--color-text)] cursor-pointer"
              >
                <option value="">所有设备</option>
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
                {[7, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                      days === d
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-cream)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {d}天
                  </button>
                ))}
              </div>
              {dateRange && (
                <span className="text-xs text-[var(--color-text-muted)] ml-auto">{dateRange}</span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)]">
                <span className="loading-dots">加载中</span>
              </div>
            ) : apps.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)]">
                暂无活动数据
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  总活跃时长：<span className="font-bold text-[var(--color-text)]">{formatHours(totalMinutes)}</span>
                </p>

                <div className="h-64 mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={apps.map(a => ({ name: a.name, minutes: a.minutes }))}
                        dataKey="minutes"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={CustomPieLabel}
                        labelLine={{ stroke: "var(--color-text-muted)", strokeWidth: 0.5 }}
                      >
                        {apps.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatHours(value as number), "时长"]}
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-xs text-[var(--color-text-muted)] mb-2">Top 应用</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={apps.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 11, fill: "var(--color-text)" }}
                        interval={0}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatHours(value as number), "时长"]}
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                        {apps.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
