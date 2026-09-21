import { emptyCharge, type Charge } from "./types";
import { parseLooseDate, parseMoney } from "./utils";
import { polyfillSafariPdfApis } from "./stream-async-iterator";

export type ParsedStatement = {
  employeeName: string;
  last4: string;
  closingDate: string;
  charges: Charge[];
  rawText: string;
};

const SKIP_VENDOR =
  /^(credits?|purchases and debits|cash advances|previous balance|new balance|minimum payment|credit line|available credit|finance charge|memo item|payment due|account number|statement closing date|trans|post|purchase date|description|order no\.?|amount)$/i;

const CHARGE_RE =
  /(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s+(?:(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s+)?([A-Z0-9][A-Z0-9 #*.,'\/&+-]*?)\s+\$?(-?[\d,]+\.\d{2})/gi;

function extractCharges(text: string): Charge[] {
  const charges: Charge[] = [];
  const seen = new Set<string>();

  const ingest = (src: string) => {
    CHARGE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CHARGE_RE.exec(src))) {
      const vendorBlob = m[3]
        .replace(/\*{3,}[\s\S]*$/, "")
        .replace(/\bMEMO ITEM\b[\s\S]*$/i, "")
        .trim();
      if (!vendorBlob || SKIP_VENDOR.test(vendorBlob)) continue;

      const transDate = withYear(m[1]);
      const postDate = m[2] ? withYear(m[2], transDate) : transDate;
      const amount = parseMoney(m[4]);
      if (!transDate || !amount) continue;

      const { vendor, orderNo } = splitVendor(vendorBlob);
      if (!vendor || SKIP_VENDOR.test(vendor) || vendor.length < 2) continue;

      const key = `${transDate}|${vendor.toLowerCase()}|${amount.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      charges.push(
        emptyCharge({
          transDate,
          postDate,
          vendor,
          orderNo,
          amount,
          description: guessDescription(vendor),
        }),
      );
    }
  };

  ingest(text);
  ingest(text.replace(/\s+/g, " "));
  return charges;
}

export function parseStatementText(text: string): ParsedStatement {
  const last4 =
    text.match(/xxxx[-\s]?xxxx[-\s]?xxxx[-\s]?(\d{4})/i)?.[1] ??
    text.match(/\*{4,}(\d{4})/)?.[1] ??
    text.match(/last\s*4[^\d]*(\d{4})/i)?.[1] ??
    "";

  const nameMatch =
    text.match(/MATTHEW\s+PITSENBARGER/i) ??
    text.match(/([A-Z][A-Z' -]+)\s+STX\s+CORP/i);
  const employeeName = nameMatch ? titleCase(nameMatch[0].replace(/\s+STX\s+CORP/i, "").trim()) : "";

  const closing =
    text.match(/statement closing date[:\s]+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)?.[1] ??
    text.match(/closing date[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i)?.[1] ??
    "";
  const closingDate = closing ? normalizeNamedDate(closing) ?? parseLooseDate(closing) ?? "" : "";

  const charges = extractCharges(text);
  return { employeeName, last4, closingDate, charges, rawText: text };
}

function splitVendor(raw: string) {
  const cleaned = raw.replace(/\s{2,}/g, " ").replace(/\*{4,}/g, "").trim();
  const order = cleaned.match(/(\d{3}-\d{7,}-\d{4,}|\b\d{10,}\b)/);
  const withoutOrder = cleaned
    .replace(order?.[0] ?? "", "")
    .replace(/\s+/g, " ")
    .trim();
  const vendor = withoutOrder
    .replace(/\s+([A-Z]{2})$/, (m, st: string) => (usState(st) ? "" : m))
    .replace(/\s+/g, " ")
    .trim();
  return { vendor: titleCase(vendor), orderNo: order?.[0] ?? "" };
}

function usState(s: string) {
  return /^(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)$/.test(
    s,
  );
}

function withYear(raw: string, fallbackIso?: string) {
  if (raw.includes("/") && raw.split("/")[2]) {
    return parseLooseDate(raw) ?? "";
  }
  const year = fallbackIso?.slice(0, 4) || guessYear();
  const [m, d] = raw.split(/[\/-]/);
  return parseLooseDate(`${m}/${d}/${year}`) ?? "";
}

function guessYear() {
  return String(new Date().getFullYear());
}

function normalizeNamedDate(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length <= 2 && w !== "st" ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/\b(Al|Ga|Tn|Nc|Sc|Fl|Tx|Wa)\b/g, (m) => m.toUpperCase());
}

function guessDescription(vendor: string) {
  const v = vendor.toLowerCase();
  if (v.includes("dollar general") || v.includes("walmart") || v.includes("grocery")) return "";
  if (v.includes("amazon")) return "";
  if (v.includes("shell") || v.includes("fuel") || v.includes("exxon")) return "Fuel";
  return "";
}

export async function extractPdfText(file: Blob, dataUrl?: string) {
  polyfillSafariPdfApis();
  const pdf = await loadPdf(file, dataUrl);
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    pages.push(await readPageText(page));
  }
  return pages.join("\n");
}

export async function renderPdfPages(file: Blob, maxPages = 3, scale = 1.35, dataUrl?: string) {
  polyfillSafariPdfApis();
  const pdf = await loadPdf(file, dataUrl);
  const out: string[] = [];
  const count = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= count; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.72));
  }
  return out;
}

async function loadPdf(file: Blob, dataUrl?: string) {
  polyfillSafariPdfApis();
  const pdfjs = await import("pdfjs-dist");
  // Load the worker onto this thread so iPhone Safari never uses a module Worker
  // (getTextContent's for-await on a worker stream is what was blowing up).
  // @ts-expect-error pdfjs worker has no types
  const workerMod = await import("pdfjs-dist/build/pdf.worker.min.mjs");
  (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = workerMod;

  const bytes = await blobToBytes(file, dataUrl);
  return pdfjs.getDocument({
    data: bytes.slice(),
    disableRange: true,
    disableStream: true,
    isOffscreenCanvasSupported: false,
    useWasm: false,
    useWorkerFetch: false,
  }).promise;
}

async function blobToBytes(file: Blob, dataUrl?: string) {
  if (dataUrl && dataUrl.includes(",")) {
    try {
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (bytes.length > 100) return bytes;
    } catch {
      /* fall through to the File */
    }
  }
  return new Uint8Array(await file.arrayBuffer());
}

async function readPageText(page: {
  streamTextContent?: (params?: object) => ReadableStream<{ items?: unknown[]; lang?: string; styles?: unknown }>;
  getTextContent: () => Promise<{ items: unknown[] }>;
}) {
  const items: unknown[] = [];
  const stream = page.streamTextContent?.({ includeMarkedContent: false, disableNormalization: true });
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value?.items?.length) items.push(...value.items);
    }
    if (items.length) return itemsToLines(items);
  }
  try {
    const content = await page.getTextContent();
    return itemsToLines(content.items);
  } catch {
    return itemsToLines(items);
  }
}

function itemsToLines(items: unknown[]) {
  const rows: { x: number; y: number; str: string }[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { str?: string; transform?: number[] };
    const str = rec.str ?? "";
    if (!str) continue;
    const x = rec.transform?.[4] ?? 0;
    const y = rec.transform?.[5] ?? 0;
    rows.push({ x, y, str });
  }
  if (!rows.length) return "";
  rows.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: string[] = [];
  let currentY = rows[0].y;
  let buf: { x: number; str: string }[] = [];
  const flush = () => {
    if (!buf.length) return;
    const line = buf
      .sort((a, b) => a.x - b.x)
      .map((p) => p.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) lines.push(line);
    buf = [];
  };
  for (const r of rows) {
    if (Math.abs(r.y - currentY) > 4) {
      flush();
      currentY = r.y;
    }
    buf.push(r);
  }
  flush();
  return lines.join("\n");
}
