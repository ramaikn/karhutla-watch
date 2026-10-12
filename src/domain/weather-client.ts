import type { WeatherLocation } from "./types";
import { normalizeWeather } from "./normalize";

interface Entry { savedAt: number; location: WeatherLocation }
type Requester = (input: string, options?: RequestInit) => Promise<Response>;
const ttl = 30 * 60_000;

export class WeatherClient {
  private cache = new Map<string, Entry>();
  private nextRequestAt = 0;
  private blockedUntil = 0;
  constructor(private readonly requester: Requester = (input, options) => globalThis.fetch(input, options), private readonly clock: () => number = Date.now) {}

  seed(locations: WeatherLocation[]): void {
    for (const location of locations) {
      const savedAt = Date.parse(location.status.lastSuccessAt ?? "");
      if (this.clock() - savedAt < ttl && location.points.length) this.cache.set(location.code, { savedAt, location });
    }
  }

  async get(code: string, signal: AbortSignal): Promise<WeatherLocation> {
    if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(code)) throw new Error("Kode lokasi tidak valid.");
    signal.throwIfAborted();
    const cached = this.cache.get(code), now = this.clock();
    if (cached && now - cached.savedAt < ttl && cached.location.points.some((point) => Date.parse(point.time) >= now)) return cached.location;
    if (now < this.blockedUntil) throw new Error("Prakiraan sedang tidak tersedia. Coba lagi sebentar.");
    const requestAt = Math.max(now, this.nextRequestAt);
    this.nextRequestAt = requestAt + 1_100;
    if (requestAt > now) await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, requestAt - now);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
    signal.throwIfAborted();
    if (this.clock() < this.blockedUntil) throw new Error("Prakiraan sedang tidak tersedia. Coba lagi sebentar.");
    const response = await this.requester(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${code}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]) });
    if (response.status === 429) {
      const retry = response.headers.get("Retry-After"), seconds = retry && /^\d+$/.test(retry) ? Number(retry) : NaN;
      const date = retry ? Date.parse(retry) : NaN;
      this.blockedUntil = this.clock() + Math.max(60_000, Number.isFinite(seconds) ? seconds * 1000 : Number.isFinite(date) ? date - this.clock() : 60_000);
    }
    if (!response.ok) throw new Error("Prakiraan untuk lokasi ini belum tersedia. Coba lagi atau pilih lokasi lain.");
    const checkedAt = new Date(this.clock()).toISOString();
    const location = normalizeWeather(await response.json(), code, { state: "ok", checkedAt, lastSuccessAt: checkedAt, message: "" });
    signal.throwIfAborted();
    this.cache.delete(code); this.cache.set(code, { savedAt: this.clock(), location });
    if (this.cache.size > 20) this.cache.delete(this.cache.keys().next().value!);
    return location;
  }
}
