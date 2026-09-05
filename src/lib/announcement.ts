export interface Announcement {
  enabled: boolean;
  content: string;
  startsAt: string;
  endsAt: string;
}

export const EMPTY_ANNOUNCEMENT: Announcement = {
  enabled: false,
  content: "",
  startsAt: "",
  endsAt: "",
};

export function parseSettings(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try { return parseSettings(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function readAnnouncement(settings: unknown): Announcement {
  const raw = parseSettings(settings);
  const nested = parseSettings(raw.announcement);
  const field = (key: keyof Announcement) => nested[key] ?? raw[`announcement.${key}`];
  const string = (key: keyof Announcement) =>
    typeof field(key) === "string" ? (field(key) as string).trim() : "";
  return {
    enabled: field("enabled") === true,
    content: string("content"),
    startsAt: string("startsAt"),
    endsAt: string("endsAt"),
  };
}

// Require an explicit timezone so every visitor sees the same scheduled interval.
export function announcementTime(value: string): number {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/);
  if (!match) return NaN;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText ? Number(secondText) : 0;
  const offsetHour = offsetHourText ? Number(offsetHourText) : 0;
  const offsetMinute = offsetMinuteText ? Number(offsetMinuteText) : 0;
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return NaN;
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) return NaN;
  return Date.parse(value);
}

export function announcementStatus(value: Announcement, now: number) {
  if (!value.enabled) return "disabled";
  const start = announcementTime(value.startsAt);
  const end = announcementTime(value.endsAt);
  if (!value.content.trim() || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "invalid";
  if (now >= end) return "expired";
  return now < start ? "scheduled" : "active";
}

export function announcementUrl(value: string): string | undefined {
  try {
    const url = new URL(value, "https://announcement.invalid");
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? value : undefined;
  } catch { return undefined; }
}

export function localDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
