export type ChargeKind = "job" | "workOrder" | "equipment" | "indirect";

export type EquipSuffix = "R" | "M" | "U";

export type Receipt = {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
};

export type Charge = {
  id: string;
  transDate: string;
  postDate: string;
  vendor: string;
  orderNo: string;
  amount: number;
  description: string;
  kind: ChargeKind | null;
  jobNumber: string;
  costCode: string;
  costLabel: string;
  woNumber: string;
  woType: "labor" | "materials" | "other" | "";
  equipNumber: string;
  equipSuffix: EquipSuffix | "";
  receipts: Receipt[];
};

export type VisaReport = {
  id: string;
  createdAt: string;
  updatedAt: string;
  weekEnding: string;
  employeeName: string;
  last4: string;
  statementName: string;
  statementDataUrl: string;
  charges: Charge[];
};

export type AppSettings = {
  employeeName: string;
  last4: string;
  suffixR: string;
  suffixM: string;
  suffixU: string;
  equipment: { number: string; name: string; keywords: string[] }[];
};

export const DEFAULT_SETTINGS: AppSettings = {
  employeeName: "Matthew Pitsenbarger",
  last4: "5935",
  suffixR: "Repair",
  suffixM: "Maintenance",
  suffixU: "Use",
  equipment: [],
};

export function emptyCharge(partial: Partial<Charge> = {}): Charge {
  return {
    id: crypto.randomUUID(),
    transDate: "",
    postDate: "",
    vendor: "",
    orderNo: "",
    amount: 0,
    description: "",
    kind: null,
    jobNumber: "",
    costCode: "",
    costLabel: "",
    woNumber: "",
    woType: "",
    equipNumber: "",
    equipSuffix: "",
    receipts: [],
    ...partial,
  };
}

export function isCoded(charge: Charge) {
  if (!charge.transDate || !charge.vendor.trim() || !charge.description.trim()) {
    return false;
  }
  if (!Number.isFinite(charge.amount) || charge.amount === 0) return false;
  switch (charge.kind) {
    case "job":
      return Boolean(charge.jobNumber.trim() && charge.costCode);
    case "workOrder":
      return Boolean(charge.jobNumber.trim() && charge.costCode);
    case "equipment":
      return Boolean(charge.equipNumber.trim() && charge.equipSuffix);
    case "indirect":
      return Boolean(charge.costCode);
    default:
      return false;
  }
}

export function codingDisplay(charge: Charge) {
  if (charge.kind === "equipment") {
    return `${charge.equipNumber.trim()}${charge.equipSuffix}`.toUpperCase();
  }
  if (charge.kind === "workOrder") {
    return [charge.jobNumber, charge.costCode].filter(Boolean).join("  ");
  }
  if (charge.kind === "indirect") {
    return charge.costCode ? `INDIRECT  ${charge.costCode}` : "";
  }
  if (charge.kind === "job") {
    return [charge.jobNumber, charge.costCode].filter(Boolean).join("  ");
  }
  return "";
}

/** Which specific coding fields are still missing on this charge, e.g. ["job #", "cost code"]. */
export function missingCodingFields(charge: Charge): string[] {
  if (!charge.kind) return ["coding (job, work order, equipment, or indirect)"];
  if (charge.kind === "equipment") {
    const missing: string[] = [];
    if (!charge.equipNumber.trim()) missing.push("equipment #");
    if (!charge.equipSuffix) missing.push("repair/maintenance/use");
    return missing;
  }
  if (charge.kind === "indirect") {
    return charge.costCode ? [] : ["cost code"];
  }
  const missing: string[] = [];
  if (!charge.jobNumber.trim()) missing.push("job #");
  if (!charge.costCode) missing.push("cost code");
  return missing;
}

export function packetFileName(report: VisaReport) {
  const ymd = report.weekEnding.replaceAll("-", "").slice(2);
  return `${ymd || "visa"} Visa Summary.pdf`;
}

export function reportTotal(report: VisaReport) {
  return report.charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
}
