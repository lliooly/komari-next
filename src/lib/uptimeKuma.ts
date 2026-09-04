export interface UptimeKumaSettings {
  enabled: boolean;
  baseUrl: string;
  slug: string;
}

export const DEFAULT_UPTIME_KUMA_SETTINGS: UptimeKumaSettings = {
  enabled: false,
  baseUrl: "",
  slug: "",
};

export type UptimeKumaServiceStatus =
  | "up"
  | "down"
  | "pending"
  | "maintenance"
  | "unknown";

export type UptimeKumaOverallStatus = "up" | "degraded" | "empty";

export interface UptimeKumaService {
  id: string;
  name: string;
  status: UptimeKumaServiceStatus;
  ping: number | null;
  uptime24h: number | null;
  lastHeartbeatAt: number | null;
  heartbeats: UptimeKumaHeartbeat[];
}

export interface UptimeKumaHeartbeat {
  status: UptimeKumaServiceStatus;
  ping: number | null;
  timestamp: number | null;
}

export interface UptimeKumaServiceGroup {
  id: string;
  name: string;
  services: UptimeKumaService[];
}

export interface UptimeKumaSnapshot {
  groups: UptimeKumaServiceGroup[];
  serviceCount: number;
  upCount: number;
  downCount: number;
  overallStatus: UptimeKumaOverallStatus;
  statusPageUrl: string;
}

export interface UptimeKumaUrls {
  statusPageApiUrl: string;
  heartbeatApiUrl: string;
  statusPageUrl: string;
}

export class UptimeKumaRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UptimeKumaRequestError";
    this.status = status;
  }
}

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecordList(value: unknown): JsonObject[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (isRecord(value)) {
    return Object.values(value).filter(isRecord);
  }

  return [];
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const result = value.trim();
  return result || null;
}

function readIdentifier(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return readString(value);
}

function readNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;

  return Number.isFinite(numberValue) ? numberValue : null;
}

function readTimestamp(value: unknown): number | null {
  const numberValue = readNumber(value);
  if (numberValue !== null) {
    return numberValue < 1_000_000_000_000 ? numberValue * 1000 : numberValue;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function unwrapData(value: unknown): unknown {
  if (isRecord(value) && isRecord(value.data)) {
    return value.data;
  }

  return value;
}

function normalizeBaseUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (url.username || url.password || url.search || url.hash) {
      return null;
    }

    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function buildUptimeKumaUrls(
  settings: Partial<UptimeKumaSettings>
): UptimeKumaUrls | null {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  const slug = readString(settings.slug);
  if (!baseUrl || !slug) {
    return null;
  }

  const encodedSlug = encodeURIComponent(slug);
  return {
    statusPageApiUrl: `${baseUrl}/api/status-page/${encodedSlug}`,
    heartbeatApiUrl: `${baseUrl}/api/status-page/heartbeat/${encodedSlug}`,
    statusPageUrl: `${baseUrl}/status/${encodedSlug}`,
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    credentials: "omit",
    signal,
  });

  if (!response.ok) {
    throw new UptimeKumaRequestError(
      `Uptime Kuma request failed with HTTP ${response.status}`,
      response.status
    );
  }

  return response.json();
}

function normalizeServiceStatus(value: unknown): UptimeKumaServiceStatus {
  const numberValue = readNumber(value);
  if (numberValue !== null) {
    if (numberValue === 1) return "up";
    if (numberValue === 0) return "down";
    if (numberValue === 2) return "pending";
    if (numberValue === 3) return "maintenance";
  }

  const stringValue = readString(value)?.toLowerCase();
  switch (stringValue) {
    case "up":
    case "ok":
    case "online":
      return "up";
    case "down":
    case "offline":
    case "error":
      return "down";
    case "pending":
    case "wait":
    case "waiting":
      return "pending";
    case "maintenance":
    case "maintain":
      return "maintenance";
    default:
      return "unknown";
  }
}

function normalizePing(value: unknown): number | null {
  const numberValue = readNumber(value);
  return numberValue !== null && numberValue >= 0 ? numberValue : null;
}

function normalizeUptime24h(value: unknown): number | null {
  const numberValue = readNumber(value);
  if (numberValue === null || numberValue < 0) {
    return null;
  }

  const percentage = numberValue <= 1 ? numberValue * 100 : numberValue;
  return Math.min(100, Math.max(0, percentage));
}

function getHeartbeatHistory(value: unknown): JsonObject[] {
  const heartbeats = asRecordList(value);
  return heartbeats
    .map((heartbeat, index) => ({ heartbeat, index, timestamp: readTimestamp(heartbeat.time) }))
    .sort((left, right) => {
      if (left.timestamp === null && right.timestamp === null) {
        return left.index - right.index;
      }
      if (left.timestamp === null) return -1;
      if (right.timestamp === null) return 1;
      return left.timestamp - right.timestamp;
    })
    .map(({ heartbeat }) => heartbeat);
}

function getLatestHeartbeat(heartbeats: JsonObject[]): JsonObject | null {
  if (heartbeats.length === 0) {
    return null;
  }

  let latest = heartbeats[heartbeats.length - 1];
  let latestTimestamp = readTimestamp(latest.time) ?? -Infinity;

  for (const heartbeat of heartbeats) {
    const timestamp = readTimestamp(heartbeat.time);
    if (timestamp !== null && timestamp >= latestTimestamp) {
      latest = heartbeat;
      latestTimestamp = timestamp;
    }
  }

  return latest;
}

function getUptimeValue(uptimeList: JsonObject, id: string): number | null {
  return normalizeUptime24h(uptimeList[`${id}_24`]);
}

function calculateOverallStatus(services: UptimeKumaService[]): UptimeKumaOverallStatus {
  if (services.length === 0) {
    return "empty";
  }

  return services.every((service) => service.status === "up") ? "up" : "degraded";
}

export function normalizeUptimeKumaResponse(
  statusPagePayload: unknown,
  heartbeatPayload: unknown,
  statusPageUrl: string
): UptimeKumaSnapshot {
  const statusPage = unwrapData(statusPagePayload);
  const heartbeatData = unwrapData(heartbeatPayload);
  const page = isRecord(statusPage) ? statusPage : {};
  const heartbeat = isRecord(heartbeatData) ? heartbeatData : {};
  const heartbeatList = isRecord(heartbeat.heartbeatList)
    ? heartbeat.heartbeatList
    : {};
  const uptimeList = isRecord(heartbeat.uptimeList) ? heartbeat.uptimeList : {};
  const groups: UptimeKumaServiceGroup[] = [];
  const seenServiceIds = new Set<string>();

  for (const rawGroup of asRecordList(page.publicGroupList)) {
    const groupId = readIdentifier(rawGroup.id) ?? `group-${groups.length + 1}`;
    const groupName =
      readString(rawGroup.name) ??
      readString(rawGroup.title) ??
      `Group ${groups.length + 1}`;
    const services: UptimeKumaService[] = [];

    for (const rawService of asRecordList(rawGroup.monitorList)) {
      const id = readIdentifier(rawService.id);
      if (!id || seenServiceIds.has(id)) {
        continue;
      }

      seenServiceIds.add(id);
      const rawHeartbeats = getHeartbeatHistory(heartbeatList[id]);
      const heartbeats: UptimeKumaHeartbeat[] = rawHeartbeats.map((rawHeartbeat) => ({
        status: normalizeServiceStatus(rawHeartbeat.status),
        ping: normalizePing(rawHeartbeat.ping),
        timestamp: readTimestamp(rawHeartbeat.time),
      }));
      const latestHeartbeat = getLatestHeartbeat(rawHeartbeats);
      const rawStatus = latestHeartbeat?.status;
      const latestTimestamp = readTimestamp(latestHeartbeat?.time);
      services.push({
        id,
        name:
          readString(rawService.name) ??
          readString(rawService.title) ??
          `Monitor ${id}`,
        status: normalizeServiceStatus(rawStatus),
        ping: normalizePing(latestHeartbeat?.ping),
        uptime24h: getUptimeValue(uptimeList, id),
        lastHeartbeatAt: latestTimestamp,
        heartbeats,
      });
    }

    if (services.length > 0) {
      groups.push({ id: groupId, name: groupName, services });
    }
  }

  const services = groups.flatMap((group) => group.services);
  const upCount = services.filter((service) => service.status === "up").length;
  const downCount = services.filter((service) => service.status === "down").length;

  return {
    groups,
    serviceCount: services.length,
    upCount,
    downCount,
    overallStatus: calculateOverallStatus(services),
    statusPageUrl,
  };
}

export async function fetchUptimeKumaStatus(
  settings: Partial<UptimeKumaSettings>,
  signal?: AbortSignal
): Promise<UptimeKumaSnapshot> {
  const urls = buildUptimeKumaUrls(settings);
  if (!urls) {
    throw new Error("Uptime Kuma URL or status page slug is invalid");
  }

  const [statusPagePayload, heartbeatPayload] = await Promise.all([
    fetchJson(urls.statusPageApiUrl, signal),
    fetchJson(urls.heartbeatApiUrl, signal),
  ]);

  return normalizeUptimeKumaResponse(
    statusPagePayload,
    heartbeatPayload,
    urls.statusPageUrl
  );
}
