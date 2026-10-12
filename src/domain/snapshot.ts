import { SENSORS, type Hotspot, type Snapshot } from "./types";

type PackedPoint = [number, number, number, number, number, number | null, number];
type StoredSnapshot = Omit<Snapshot, "hotspots"> & { hotspots?: Hotspot[]; packedHotspots?: PackedPoint[] };
const confidence = ["l", "n", "h"] as const;

// Koordinat tidak dibulatkan. Tuple menghilangkan pengulangan nama kolom dan identitas.
export function encodeSnapshot(snapshot: Snapshot): StoredSnapshot {
  const { hotspots, ...metadata } = snapshot;
  return { ...metadata, packedHotspots: hotspots.map((point) => [
    point.latitude, point.longitude, Date.parse(point.observedAt) / 1_000,
    SENSORS.indexOf(point.sensor), confidence.indexOf(point.confidence), point.frp,
    point.dayNight === "D" ? 1 : point.dayNight === "N" ? 0 : -1,
  ]) };
}

export function decodeSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== "object") throw new Error("Snapshot tidak valid.");
  const data = value as StoredSnapshot;
  if (!Array.isArray(data.packedHotspots)) return data as Snapshot;
  const hotspots = data.packedHotspots.map((tuple): Hotspot => {
    if (!Array.isArray(tuple) || tuple.length !== 7 ||
      !Number.isFinite(tuple[0]) || !Number.isFinite(tuple[1]) || Math.abs(tuple[0]) > 90 || Math.abs(tuple[1]) > 180 ||
      !Number.isFinite(tuple[2]) || !Number.isInteger(tuple[3]) || !SENSORS[tuple[3]] || !Number.isInteger(tuple[4]) || !confidence[tuple[4]] ||
      (tuple[5] !== null && !Number.isFinite(tuple[5])) || ![-1, 0, 1].includes(tuple[6])) throw new Error("Deteksi snapshot tidak valid.");
    const [latitude, longitude, seconds, sensorIndex, confidenceIndex, frp, dayNight] = tuple;
    const observedAt = new Date(seconds * 1_000).toISOString(), sensor = SENSORS[sensorIndex];
    return { id: `${sensor}:${observedAt}:${latitude}:${longitude}`, latitude, longitude, observedAt, sensor, confidence: confidence[confidenceIndex], frp, dayNight: dayNight === 1 ? "D" : dayNight === 0 ? "N" : null };
  });
  const { packedHotspots: _, ...metadata } = data;
  return { ...metadata, hotspots };
}
