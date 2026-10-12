export const SENSORS = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT"] as const;
export type Sensor = (typeof SENSORS)[number];
export type Confidence = "l" | "n" | "h";
export type SourceState = "ok" | "partial" | "stale" | "unavailable";

export interface SourceStatus {
  state: SourceState;
  checkedAt: string | null;
  lastSuccessAt: string | null;
  message: string;
}

export interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  sensor: Sensor;
  confidence: Confidence;
  frp: number | null;
  dayNight: "D" | "N" | null;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  domain: string;
  indexedAt: string;
  language: string;
  provider?: string;
  publishedAt?: string;
}

export interface WeatherPoint {
  time: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: string;
  description: string;
}

export interface WeatherLocation {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  issuedAt: string | null;
  points: WeatherPoint[];
  status: SourceStatus;
}

export interface Snapshot {
  version: 1;
  generatedAt: string | null;
  coverage: { start: string | null; end: string | null };
  sources: { firms: SourceStatus; news: SourceStatus; weather: SourceStatus };
  sensorStatus: Partial<Record<Sensor, SourceStatus>>;
  hotspots: Hotspot[];
  articles: Article[];
  weather: WeatherLocation[];
  boundary: { source: string; license: string; year: string; url: string } | null;
}

export interface Filters {
  hours: number;
  region: string;
  confidence: "all" | "reliable" | "h";
  sensor: "all" | Sensor;
}
