export interface LocationIndex {
  version: 1;
  source: string;
  reference: string;
  rows: [string, string][];
}
export interface SearchLocation { code: string; name: string; context: string; nameKey: string; searchable: string }
const clean = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("id").replace(/[^\p{L}\p{N}.]+/gu, " ").trim();

export function buildLocations(value: unknown): SearchLocation[] {
  const index = value as LocationIndex;
  if (!index || index.version !== 1 || !Array.isArray(index.rows) || index.rows.some((row) => !Array.isArray(row) || typeof row[0] !== "string" || typeof row[1] !== "string")) throw new Error("Indeks wilayah tidak valid.");
  const names = new Map(index.rows);
  return index.rows.filter(([code]) => /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(code)).map(([code, name]) => {
    const context = [names.get(code.slice(0, 8)), names.get(code.slice(0, 5)), names.get(code.slice(0, 2))].filter(Boolean).join(", ");
    return { code, name, context, nameKey: clean(name), searchable: clean(`${name} ${context} ${code}`) };
  });
}

export function searchLocations(locations: SearchLocation[], query: string, limit = 30): { matches: SearchLocation[]; total: number } {
  const normalized = clean(query), words = normalized.split(/\s+/);
  if (normalized.length < 2) return { matches: [], total: 0 };
  const matches = locations.filter((location) => words.every((word) => location.searchable.includes(word)));
  const score = (location: SearchLocation) => location.code === normalized || location.nameKey === normalized ? 0 : location.nameKey.startsWith(normalized) ? 1 : 2;
  matches.sort((a, b) => score(a) - score(b) || a.code.localeCompare(b.code));
  return { matches: matches.slice(0, limit), total: matches.length };
}
