import { FLEET_DIRECTORY } from "./fleet-directory";

export type EquipUnit = {
  number: string;
  name: string;
  keywords: string[];
  assignedTo?: string;
  type?: string;
  flags?: string;
  status?: string;
  site?: string;
  year?: string;
  make?: string;
  model?: string;
  searchText?: string;
};

export const STX_FLEET: EquipUnit[] = FLEET_DIRECTORY.map((row) => ({
  number: row.code,
  name: row.name,
  assignedTo: row.assignedTo,
  type: row.type,
  flags: row.flags,
  status: row.status,
  site: row.site,
  year: row.year,
  make: row.make,
  model: row.model,
  searchText: row.searchText,
  keywords: [],
}));

export function normalizeEquipNumber(raw: string) {
  return raw.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
}

export function keywordsFor(name: string) {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function parseEquipPaste(raw: string): EquipUnit[] {
  const out: EquipUnit[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(/[\t,;]+/).map((p) => p.trim()).filter(Boolean);
    let number = "";
    let name = "";
    if (parts.length >= 2) {
      number = normalizeEquipNumber(parts[0]);
      name = parts.slice(1).join(" ");
    } else {
      const m = t.match(/^([A-Za-z]{1,6}\d[\w-]*)\s+(.+)$/) || t.match(/^(\d[\w-]*)\s+(.+)$/);
      if (m) {
        number = normalizeEquipNumber(m[1]);
        name = m[2].trim();
      } else {
        number = normalizeEquipNumber(t);
      }
    }
    if (!number) continue;
    const key = number.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      number,
      name,
      keywords: keywordsFor(name),
      searchText: `${number} ${name}`.toLowerCase(),
    });
  }
  return out;
}

export function mergeEquipment(...lists: EquipUnit[][]) {
  const map = new Map<string, EquipUnit>();
  for (const list of lists) {
    for (const unit of list) {
      const number = normalizeEquipNumber(unit.number);
      if (!number) continue;
      const prev = map.get(number);
      map.set(number, {
        number,
        name: unit.name || prev?.name || "",
        assignedTo: unit.assignedTo || prev?.assignedTo,
        type: unit.type || prev?.type,
        flags: unit.flags || prev?.flags,
        status: unit.status || prev?.status,
        site: unit.site || prev?.site,
        year: unit.year || prev?.year,
        make: unit.make || prev?.make,
        model: unit.model || prev?.model,
        searchText: prev?.searchText || unit.searchText || haystack(unit),
        keywords: Array.from(new Set([...(prev?.keywords ?? []), ...keywordsFor(unit.name), ...unit.keywords])),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName || a.number.localeCompare(b.number, undefined, { numeric: true });
  });
}

function haystack(unit: EquipUnit) {
  return [
    unit.searchText,
    unit.number,
    unit.name,
    unit.assignedTo,
    unit.type,
    unit.flags,
    unit.site,
    unit.year,
    unit.make,
    unit.model,
    ...(unit.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function queryWords(query: string) {
  return query
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);
}

export function searchEquipment(query: string, fleet: EquipUnit[]) {
  const words = queryWords(query);
  if (!words.length) return fleet;
  return fleet
    .map((unit) => ({ unit, score: scoreUnit(unit, words) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.unit.number.localeCompare(b.unit.number))
    .map((x) => x.unit);
}

function scoreUnit(unit: EquipUnit, words: string[]) {
  const hay = haystack(unit);
  if (!words.every((w) => hay.includes(w))) return 0;
  const number = unit.number.toLowerCase();
  const name = unit.name.toLowerCase();
  const assigned = (unit.assignedTo ?? "").toLowerCase();
  const q = words.join(" ");
  if (number === q.replace(/\s+/g, "")) return 100;
  if (number.startsWith(words[0]) && words.length === 1) return 90;
  if (assigned && words.every((w) => assigned.includes(w))) return 80;
  if (name.includes(q)) return 70;
  if (words.every((w) => name.includes(w))) return 60;
  return 40;
}

export const EQUIP_TYPE_CHIPS = [
  "Backhoe",
  "Loader",
  "Skid steer",
  "Excavator",
  "Crew truck",
  "Supervisor",
  "Tamper",
  "Dump",
  "Trailer",
  "Air compressor",
];
