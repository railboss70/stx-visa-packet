import { emptyCharge, type Charge } from "./types";
import { parseLooseDate, parseMoney } from "./utils";
import { polyfillReadableStreamAsyncIterator } from "./stream-async-iterator";

export type ParsedStatement = {
  employeeName: string;
  last4: string;
  closingDate: string;
  charges: Charge[];
  rawText: string;
};

const SKIP =
  /memo item|previous balance|new balance|payment due|minimum payment|finance charge|credit line|available credit|purchases and debits|cash advances|page \d/i;

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

function extractCharges(text: string): Charge[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const charges: Charge[] = [];
  const seen = new Set<string>();
  const row =
    /(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s+(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)?\s*(.+?)\s+\$?(-?[\d,]+\.\d{2})\s*$/;

  for (const line of lines) {
    if (SKIP.test(line)) continue;
    const m = line.match(row);
    if (!m) continue;
    const vendorBlob = m[3].replace(/\*{3,}.*$/, "").trim();
    if (!vendorBlob || /^(credits|purchases|amount|description)$/i.test(vendorBlob)) continue;

    const transDate = withYear(m[1]);
    const postDate = m[2] ? withYear(m[2], transDate) : transDate;
    const amount = parseMoney(m[4]);
    if (!transDate || !amount) continue;

    const { vendor, orderNo } = splitVendor(vendorBlob);
    const key = `${transDate}|${vendor}|${amount}`;
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

  if (charges.length === 0) {
    const global =
      /(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+([A-Z0-9][A-Z0-9 #*.,'\/&-]+?)\s+\$?([\d,]+\.\d{2})/g;
    let m: RegExpExecArray | null;
    while ((m = global.exec(text.replace(/\s+/g, " ")))) {
      if (SKIP.test(m[0])) continue;
      const transDate = withYear(m[1]);
      const amount = parseMoney(m[4]);
      const { vendor, orderNo } = splitVendor(m[3]);
      const key = `${transDate}|${vendor}|${amount}`;
      if (seen.has(key) || !vendor) continue;
      seen.add(key);
      charges.push(
        emptyCharge({
          transDate,
          postDate: withYear(m[2], transDate),
          vendor,
          orderNo,
          amount,
          description: guessDescription(vendor),
        }),
      );
    }
  }

  return charges;
}

function splitVendor(raw: string) {
  const cleaned = raw.replace(/\s{2,}/g, " ").replace(/\*{4,}/g, "").trim();
  const order = cleaned.match(/(\d{3}-\d{7,}-\d{4,}|\b\d{10,}\b)/);
  const vendor = cleaned
    .replace(order?.[0] ?? "", "")
    .replace(/\s+[A-Z]{2}$/, (st) => (usState(st.trim()) ? "" : st))
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

export async function extractPdfText(file: Blob) {
  polyfillReadableStreamAsyncIterator();
  const pdf = await loadPdf(file);
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    pages.push(await readPageText(page));
  }
  return pages.join("\n");
}

export async function renderPdfPages(file: Blob, maxPages = 3, scale = 1.35) {
  polyfillReadableStreamAsyncIterator();
  const pdf = await loadPdf(file);
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

async function loadPdf(file: Blob) {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  GlobalWorkerOptions.workerSrc = worker;
  const bytes = new Uint8Array(await file.arrayBuffer());
  return getDocument({
    data: bytes.slice(),
    disableRange: true,
    disableStream: true,
    isOffscreenCanvasSupported: false,
  }).promise;
}

async function readPageText(page: {
  getTextContent: () => Promise<{ items: unknown[] }>;
  streamTextContent?: () => ReadableStream<{ items?: Array<{ str?: string }> }>;
}) {
  try {
    const content = await page.getTextContent();
    return content.items
      .map((item) => (item && typeof item === "object" && "str" in item ? String((item as { str?: string }).str ?? "") : ""))
      .join(" ");
  } catch {
    if (!page.streamTextContent) return "";
    const reader = page.streamTextContent().getReader();
    const parts: string[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const item of value?.items ?? []) {
        if (item.str) parts.push(item.str);
      }
    }
    return parts.join(" ");
  }
}
