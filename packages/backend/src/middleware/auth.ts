import {
  deleteRuntimeDeviceConfig,
  getRuntimeDeviceConfigs,
  upsertRuntimeDeviceConfig,
} from "../db";
import type { DeviceInfo } from "../types";

type Platform = DeviceInfo["platform"];

type DeviceTokenConfig = DeviceInfo & {
  token: string;
  panel_id?: string;
  source: "env" | "runtime";
};

const envTokenMap = new Map<string, DeviceTokenConfig>();
const runtimeByDeviceId = new Map<string, DeviceTokenConfig>();
let effectiveTokenMap = new Map<string, DeviceTokenConfig>();
let configuredDeviceIds = new Set<string>();

function isSupportedPlatform(value: string): value is Platform {
  return value === "windows" || value === "android" || value === "macos";
}

function rebuildEffectiveConfigs(): void {
  const nextMap = new Map<string, DeviceTokenConfig>();
  const runtimeDeviceIds = new Set(Array.from(runtimeByDeviceId.keys()));

  for (const config of envTokenMap.values()) {
    // Runtime configs with the same device_id override env-defined device tokens.
    if (!runtimeDeviceIds.has(config.device_id)) {
      nextMap.set(config.token, config);
    }
  }

  for (const config of runtimeByDeviceId.values()) {
    nextMap.set(config.token, config);
  }

  effectiveTokenMap = nextMap;
  configuredDeviceIds = new Set(Array.from(nextMap.values()).map((item) => item.device_id));
}

function loadRuntimeConfigs(): void {
  runtimeByDeviceId.clear();

  const rows = getRuntimeDeviceConfigs();
  for (const row of rows) {
    const token = row.token?.trim();
    const device_id = row.device_id?.trim();
    const device_name = row.device_name?.trim();
    const platform = row.platform?.trim();

    if (!token || !device_id || !device_name || !platform || !isSupportedPlatform(platform)) {
      continue;
    }

    runtimeByDeviceId.set(device_id, {
      token,
      device_id,
      device_name,
      platform,
      panel_id: row.panel_id?.trim() || undefined,
      source: "runtime",
    });
  }

  rebuildEffectiveConfigs();
}

// Parse DEVICE_TOKEN_N env vars: "token:device_id:device_name:platform"
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("DEVICE_TOKEN_") && value) {
    const parts = value.split(":");
    if (parts.length >= 4) {
      const hasPanelId = parts.length >= 5;
      const [token, device_id, device_name, platform, panel_id] = [
        parts[0],
        parts[1],
        hasPanelId ? parts.slice(2, -2).join(":") : parts.slice(2, -1).join(":"), // device_name may contain colons
        parts[hasPanelId ? parts.length - 2 : parts.length - 1],
        hasPanelId ? parts[parts.length - 1] : undefined,
      ];
      if (token && device_id && device_name && isSupportedPlatform(platform)) {
        envTokenMap.set(token, {
          token,
          device_id,
          device_name,
          platform,
          panel_id: panel_id || undefined,
          source: "env",
        });
      }
    }
  }
}

loadRuntimeConfigs();

if (effectiveTokenMap.size === 0) {
  console.warn("[auth] No device tokens configured. Set DEVICE_TOKEN_N env vars.");
}

console.log(`[auth] Loaded ${effectiveTokenMap.size} active device token(s)`);

export function authenticateToken(authHeader: string | null): DeviceInfo | null {
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];
  if (!token) return null;

  const config = effectiveTokenMap.get(token);
  if (!config) return null;

  return {
    device_id: config.device_id,
    device_name: config.device_name,
    platform: config.platform,
  };
}

export function isConfiguredDeviceId(deviceId: string): boolean {
  return configuredDeviceIds.has(deviceId);
}

export function getConfiguredDeviceIds(): string[] {
  return Array.from(configuredDeviceIds);
}

export interface AdminDeviceConfigInput {
  token: string;
  device_id: string;
  device_name: string;
  platform: string;
  panel_id?: string;
}

export interface AdminDeviceConfig {
  token: string;
  device_id: string;
  device_name: string;
  platform: Platform;
  panel_id?: string;
  source: "env" | "runtime";
}

export function getAdminDeviceConfigs(): AdminDeviceConfig[] {
  return Array.from(effectiveTokenMap.values())
    .map((item) => ({
      token: item.token,
      device_id: item.device_id,
      device_name: item.device_name,
      platform: item.platform,
      panel_id: item.panel_id,
      source: item.source,
    }))
    .sort((a, b) => a.device_id.localeCompare(b.device_id));
}

export function upsertAdminDeviceConfig(input: AdminDeviceConfigInput): boolean {
  const token = input.token.trim();
  const device_id = input.device_id.trim();
  const device_name = input.device_name.trim();
  const platform = input.platform.trim();
  const panel_id = input.panel_id?.trim() || undefined;

  if (!token || !device_id || !device_name || !isSupportedPlatform(platform)) {
    return false;
  }

  upsertRuntimeDeviceConfig({
    token,
    device_id,
    device_name,
    platform,
    panel_id,
  });

  runtimeByDeviceId.set(device_id, {
    token,
    device_id,
    device_name,
    platform,
    panel_id,
    source: "runtime",
  });
  rebuildEffectiveConfigs();

  return true;
}

export function deleteAdminDeviceConfig(deviceId: string): boolean {
  const normalized = deviceId.trim();
  if (!normalized) return false;

  const changes = deleteRuntimeDeviceConfig(normalized);
  runtimeByDeviceId.delete(normalized);
  rebuildEffectiveConfigs();

  return changes > 0;
}

export function getDevicePanelId(deviceId: string): string | undefined {
  const config = effectiveTokenMap.get(
    Array.from(effectiveTokenMap.entries()).find(([, v]) => v.device_id === deviceId)?.[0] ?? "",
  );
  return config?.panel_id || undefined;
}

export interface PanelDef {
  id: string;
  name: string;
}

export function getPanels(): PanelDef[] {
  const raw = process.env.PANELS?.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p: unknown) => {
        if (!p || typeof p !== "object") return false;
        const r = p as Record<string, unknown>;
        return typeof r.id === "string" && typeof r.name === "string";
      })
      .map((p: Record<string, unknown>) => ({ id: p.id as string, name: p.name as string }));
  } catch {
    return [];
  }
}
