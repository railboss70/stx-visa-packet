export type CodeBucket = "job" | "indirect" | "workOrder";

export type CostCode = {
  code: string;
  label: string;
  bucket: CodeBucket;
  keywords: string[];
  woNumber?: string;
  woType?: "labor" | "materials" | "other";
};

function job(code: string, label: string, keywords: string[] = []): CostCode {
  return { code, label, bucket: "job", keywords };
}

function indirect(code: string, label: string, keywords: string[] = []): CostCode {
  return { code, label, bucket: "indirect", keywords };
}

export const JOB_CODES: CostCode[] = [
  job("61104", "Employees — Lodging Crew", ["hotel", "motel", "lodging", "inn", "crew stay"]),
  job("61105", "Employees — Lodging Management", ["hotel", "lodging", "management stay"]),
  job("61106", "Employees — Orientations", ["orientation", "onboarding"]),
  job("61107", "Employees — Special Credentials", ["twic", "e-railsafe", "badge", "credential", "id"]),
  job("61113", "Employees — Temporary Housing Consumables", ["housing", "apartment", "airbnb"]),
  job("61201", "Equipment — Internal Expenses", ["equip", "internal"]),
  job("61202", "Equipment — Owned Maintenance", ["repair", "shop", "parts", "maintenance"]),
  job("61501", "Permitting — Trucking", ["permit", "oversize", "escort"]),
  job("61601", "Project — Consumables / PPE and Safety", [
    "ppe",
    "safety",
    "gloves",
    "vest",
    "hard hat",
    "glasses",
    "earplug",
    "heat",
    "sunscreen",
    "first aid",
  ]),
  job("61602", "Project — Consumables / Supplies", ["supplies", "consumable", "tape", "zip tie", "rags"]),
  job("61603", "Project — Fuel / Lubricants", [
    "fuel",
    "diesel",
    "gas",
    "gasoline",
    "def",
    "oil",
    "lube",
    "shell",
    "chevron",
    "exxon",
    "mobil",
    "circle k",
    "murphy",
    "racetrac",
    "pilot",
    "loves",
    "love's",
    "wawa",
    "buc-ee",
  ]),
  job("61604", "Project — Ice and Water", [
    "water",
    "ice",
    "drink",
    "gatorade",
    "cooler",
    "32pk",
    "drinking",
  ]),
  job("61608", "Project — Office Supplies", ["office", "paper", "toner", "pen", "notebook", "staples"]),
  job("61612", "Project — Postage", ["postage", "usps", "ups", "fedex", "shipping", "stamps"]),
  job("61615", "Project — Temporary Services", ["temp", "portable", "service"]),
  job("61701", "Rental — Dumpster / Disposal", ["dumpster", "rolloff", "disposal", "waste"]),
  job("61702", "Rental — Equipment", ["rental", "united rentals", "sunbelt", "herc"]),
  job("61703", "Rental — Equipment Maintenance", ["rental repair"]),
  job("61704", "Rental — Equipment Prep", ["rental prep"]),
  job("61706", "Rental — Sanitary Facilities", ["porta", "portable toilet", "restroom", "sanitary"]),
  job("61707", "Rental — Small Equipment / Tools", ["tool rental"]),
  job("61708", "Rental — Utility Vehicles", ["utv", "gator", "mule"]),
  job("61709", "Rental — Vehicles", ["enterprise", "hertz", "budget", "rental car"]),
  job("61710", "Rental — Crane", ["crane"]),
];

export const INDIRECT_CODES: CostCode[] = [
  indirect("500.014", "Welding Gas and Misc Bolts", ["welding", "oxygen", "acetylene", "bolt", "gas bottle"]),
  indirect("500.021", "Safety Equipment & Supplies", ["safety", "ppe", "harness"]),
  indirect("500.022", "Postage to Jobs", ["postage", "ship to job"]),
  indirect("500.023", "Palmetto Yard Labor", ["palmetto", "yard labor"]),
  indirect("500.024", "Mech Misc Time Palmetto", ["mechanic", "palmetto", "shop time"]),
  indirect("500.025", "STX Yard Upgrades (Palmetto and MH)", ["yard upgrade", "palmetto", "mh"]),
  indirect("500.026", "Small tools", ["small tool", "hammer", "wrench", "hand tool"]),
  indirect("500.027", "Summit Meeting", ["summit", "meeting", "conference"]),
  indirect("500.029", "Consumables (handles, blades, bits)", ["blade", "bit", "handle", "consumable"]),
  indirect("500.030", "Relocation", ["relocation", "move", "transfer"]),
  indirect("500.034", "MSHA and OSHA Annual Training", ["msha", "osha", "training"]),
  indirect("500.035", "RWP Annual Training", ["rwp", "roadway worker"]),
  indirect("500.037", "Business Development", ["bizdev", "business development"]),
  indirect("500.038", "Business Development Salary", ["bizdev salary"]),
  indirect("500.039", "Business Development Expenses", ["bizdev expense", "client dinner", "entertainment"]),
  indirect("500.400", "Tenna Expenditures", ["tenna", "gps", "telematics"]),
  indirect("500.451", "Power Track Tools — Air", ["air tool", "pneumatic"]),
  indirect("500.452", "Power Track Tools — Hydraulic", ["hydraulic tool"]),
  indirect("500.453", "Power Track Tools — Battery", ["battery tool", "milwaukee", "dewalt"]),
  indirect("500.454", "Power Track Tools — Welding", ["welder", "lincoln", "miller"]),
  indirect("500.455", "Power Track Tools — Repair", ["tool repair"]),
  indirect("500.461", "Hydraulic Power Units — Purchase", ["hpu", "power unit"]),
  indirect("500.462", "Hydraulic Power Units — Hoses", ["hose", "hydraulic hose"]),
  indirect("500.465", "Hydraulic Power Units — Spare Parts", ["hpu parts"]),
  indirect("500.471", "Other Tools — Hand Track Tools", ["track tool", "lining bar", "spike maul"]),
  indirect("500.472", "Other Tools — Small Misc Tools", ["misc tool"]),
  indirect("500.473", "Other Tools — Track Items", ["track item"]),
  indirect("500.474", "Other Tools — Load Securement", ["strap", "chain", "binder", "securement"]),
  indirect("500.475", "Other Tools — Repairs and Specialty Fabrication", ["fab", "fabrication"]),
  indirect("500.481", "Construction Consumables — Rail Saw Blades", ["rail saw", "saw blade"]),
  indirect("500.482", "Construction Consumables — Track Drill Bits", ["drill bit", "track drill"]),
  indirect("500.483", "Construction Consumables — Handles", ["handle"]),
  indirect("500.484", "Construction Consumables — Marking/Layout", ["marking", "paint", "layout", "keel"]),
  indirect("500.485", "Construction Consumables — Misc", ["consumable misc"]),
  indirect("500.491", "Yard Consumables — Welding", ["yard weld", "rod", "wire"]),
  indirect("500.492", "Yard Consumables — Cleaning", ["cleaner", "degreaser", "simple green"]),
  indirect("500.493", "Yard Consumables — Fasteners", ["fastener", "nut", "bolt", "washer"]),
  indirect("500.494", "Yard Consumables — Hydraulic Parts", ["fitting", "o-ring"]),
  indirect("500.495", "Yard Consumables — Fabrication Supplies", ["steel", "plate", "angle"]),
  indirect("500.496", "Yard Consumables — Inventory Parts", ["inventory"]),
  indirect("600.501", "Software — Website/Email (GoDaddy)", ["godaddy", "domain", "email", "website"]),
  indirect("600.502", "Software — Storage & Programs", ["dropbox", "google drive", "storage", "adobe", "microsoft"]),
  indirect("600.503", "Software — Timekeeping (Exaktime)", ["exaktime", "timeclock", "timekeeping"]),
  indirect("600.504", "Software — OPS & Estimating", ["estimating", "hcss", "heavyjob", "ops"]),
  indirect("600.505", "Software — AI Subscriptions", ["grok", "chatgpt", "openai", "claude", "xai", "ai"]),
];

function padWo(n: number) {
  return String(n).padStart(3, "0");
}

function buildWorkOrders(): CostCode[] {
  const rows: CostCode[] = [
    {
      code: "41899",
      label: "Work Order Inspections — Labor",
      bucket: "workOrder",
      keywords: ["inspection", "inspect"],
      woNumber: "INS",
      woType: "labor",
    },
    {
      code: "61699",
      label: "Work Order Inspections — Other",
      bucket: "workOrder",
      keywords: ["inspection"],
      woNumber: "INS",
      woType: "other",
    },
  ];
  for (let n = 1; n <= 20; n++) {
    const wo = padWo(n);
    rows.push({
      code: String(41800 + n),
      label: `Work Order #${wo} — Labor`,
      bucket: "workOrder",
      keywords: ["labor", `wo ${n}`, `work order ${n}`],
      woNumber: wo,
      woType: "labor",
    });
    rows.push({
      code: String(31670 + n),
      label: `Work Order #${wo} — Materials`,
      bucket: "workOrder",
      keywords: ["materials", `wo ${n}`],
      woNumber: wo,
      woType: "materials",
    });
    rows.push({
      code: String(61650 + n),
      label: `Work Order #${wo} — Other`,
      bucket: "workOrder",
      keywords: ["other", `wo ${n}`],
      woNumber: wo,
      woType: "other",
    });
  }
  return rows;
}

export const WORK_ORDER_CODES = buildWorkOrders();

export const ALL_CODES: CostCode[] = [...JOB_CODES, ...INDIRECT_CODES, ...WORK_ORDER_CODES];

export const WORK_ORDER_NUMBERS = [
  "INS",
  ...Array.from({ length: 20 }, (_, i) => padWo(i + 1)),
];

export function findCode(code: string) {
  const needle = code.trim().toLowerCase();
  return ALL_CODES.find((c) => c.code.toLowerCase() === needle);
}

export function searchCodes(query: string, bucket?: CodeBucket) {
  const q = query.trim().toLowerCase();
  const pool = bucket ? ALL_CODES.filter((c) => c.bucket === bucket) : ALL_CODES;
  if (!q) return pool;
  const scored = pool
    .map((c) => ({ c, s: scoreCode(c, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.map((x) => x.c);
}

function scoreCode(c: CostCode, q: string) {
  const code = c.code.toLowerCase();
  const label = c.label.toLowerCase();
  if (code === q) return 100;
  if (code.startsWith(q)) return 80;
  if (code.includes(q)) return 60;
  if (label.startsWith(q)) return 50;
  if (label.includes(q)) return 40;
  if (c.keywords.some((k) => k.includes(q) || q.includes(k))) return 35;
  const parts = q.split(/\s+/);
  if (parts.every((p) => label.includes(p) || code.includes(p))) return 25;
  return 0;
}

export function suggestCodes(input: { description?: string; vendor?: string; kind?: CodeBucket | "equipment" | null }) {
  if (input.kind === "equipment") return [];
  const blob = `${input.vendor ?? ""} ${input.description ?? ""}`.toLowerCase();
  if (!blob.trim()) return [];
  const bucket: CodeBucket | undefined =
    input.kind === "job" || input.kind === "indirect" || input.kind === "workOrder"
      ? input.kind
      : undefined;
  const pool = bucket ? ALL_CODES.filter((c) => c.bucket === bucket) : ALL_CODES;
  const ranked = pool
    .map((c) => {
      let s = 0;
      for (const k of c.keywords) {
        if (k.length < 3) continue;
        if (blob.includes(k)) s += Math.min(25, k.length * 2);
      }
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return ranked.slice(0, 4).map((x) => x.c);
}

export function woLabel(woNumber: string) {
  return woNumber === "INS" ? "Inspections" : `Work Order #${woNumber}`;
}
