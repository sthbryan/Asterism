export type PlatformDownloads = {
  macos: number;
  windows: number;
  linux: number;
  other: number;
};

export type SeriesPoint = {
  ts: number;
  value: number;
};

export type TrafficDay = {
  ts: number;
  count: number;
  uniques: number;
};

export type Traffic = {
  count: number;
  uniques: number;
  days?: TrafficDay[];
  fetchedAt?: number | null;
  sampleFrom?: number | null;
  sampleTo?: number | null;
};

export type TrafficStatus = "ok" | "forbidden" | "error" | "unavailable";

export type Referrer = {
  referrer: string;
  count: number;
  uniques: number;
};

export type PopularPath = {
  path: string;
  title: string | null;
  count: number;
  uniques: number;
};

export type LanguageShare = {
  name: string;
  bytes: number;
};
