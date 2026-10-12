import { assignProvinces, type Province } from "./rankings";
import type { Hotspot } from "./types";

self.onmessage = (event: MessageEvent<{ points: Hotspot[]; provinces: Province[] }>) => {
  try { self.postMessage({ assignments: [...assignProvinces(event.data.points, event.data.provinces)] }); }
  catch { self.postMessage({ error: true }); }
};
