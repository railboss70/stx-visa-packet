export type EquipUnit = {
  number: string;
  name: string;
  keywords: string[];
};

const TYPE_ALIASES: Record<string, string[]> = {
  backhoe: ["back hoe", "back-hoe", "hoe", "bh"],
  loader: ["front end", "wheel loader", "end loader", "fel", "bucket loader"],
  excavator: ["trackhoe", "track hoe", "ex", "digging", "crawler"],
  tamper: ["tamp", "ballast tamper"],
  regulator: ["ballast regulator"],
  pickup: ["truck", "crew truck", "f150", "f-150", "f250", "f-250"],
  dump: ["dump truck", "end dump"],
  trailer: ["lowboy", "tag", "equipment trailer"],
  welder: ["weld", "lincoln"],
  forklift: ["fork lift", "lift truck"],
  "skid steer": ["skidsteer", "bobcat", "ssl"],
  compressor: ["air compressor"],
  generator: ["gen", "light plant"],
  crane: ["boom", "picker"],
  "hi-rail": ["hirail", "hi rail", "hyrail"],
  dozer: ["bulldozer", "crawler tractor"],
  roller: ["compactor"],
};

export function normalizeEquipNumber(raw: string) {
  return raw.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
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
    out.push({ number, name, keywords: keywordsFor(name) });
  }
  return out;
}

export function keywordsFor(name: string) {
  const n = name.toLowerCase();
  const extra: string[] = [];
  for (const [type, aliases] of Object.entries(TYPE_ALIASES)) {
    if (n.includes(type) || aliases.some((a) => n.includes(a))) {
      extra.push(type, ...aliases);
    }
  }
  return Array.from(new Set([n, ...n.split(/\s+/).filter((w) => w.length > 2), ...extra]));
}

export function mergeEquipment(...lists: EquipUnit[][]) {
  const map = new Map<string, EquipUnit>();
  for (const list of lists) {
    for (const unit of list) {
      const number = normalizeEquipNumber(unit.number);
      if (!number) continue;
      const prev = map.get(number);
      const name = (unit.name || prev?.name || "").trim();
      map.set(number, {
        number,
        name,
        keywords: Array.from(new Set([...(prev?.keywords ?? []), ...keywordsFor(name), ...unit.keywords])),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName || a.number.localeCompare(b.number, undefined, { numeric: true });
  });
}

export function searchEquipment(query: string, fleet: EquipUnit[]) {
  const q = query.trim().toLowerCase();
  if (!q) return fleet;
  const expanded = new Set<string>([q, ...q.split(/\s+/).filter(Boolean)]);
  for (const [type, aliases] of Object.entries(TYPE_ALIASES)) {
    if (q.includes(type) || aliases.some((a) => q.includes(a) || a.includes(q))) {
      expanded.add(type);
      for (const a of aliases) expanded.add(a);
    }
  }
  return fleet
    .map((unit) => ({ unit, score: scoreUnit(unit, q, expanded) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.unit.name.localeCompare(b.unit.name))
    .map((x) => x.unit);
}

function scoreUnit(unit: EquipUnit, q: string, expanded: Set<string>) {
  const number = unit.number.toLowerCase();
  const name = unit.name.toLowerCase();
  if (number === q) return 100;
  if (number.startsWith(q)) return 90;
  if (number.includes(q)) return 70;
  if (name === q) return 80;
  if (name.startsWith(q)) return 60;
  if (name.includes(q)) return 50;
  for (const token of expanded) {
    if (token.length < 2) continue;
    if (unit.keywords.some((k) => k.includes(token) || token.includes(k))) return 40;
  }
  return 0;
}

export const EQUIP_TYPE_CHIPS = [
  "Backhoe",
  "Loader",
  "Excavator",
  "Tamper",
  "Regulator",
  "Pickup",
  "Dump",
  "Trailer",
  "Welder",
  "Skid steer",
  "Forklift",
];
