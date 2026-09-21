import { twMerge } from "tailwind-merge";

export function cn(...parts: Array<string | undefined | false | null>) {
  return twMerge(parts.filter(Boolean).join(" "));
}

export function assetUrl(path: string) {
  const base = import.meta.env.BASE_URL ?? "/";
  const trimmed = path.replace(/^\//, "");
  return `${base}${trimmed}`;
}

export function uid() {
  return crypto.randomUUID();
}

export function formatMoney(n: number) {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `($${formatted})` : `$${formatted}`;
}

export function toIsoDate(value: Date | string) {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = parseLooseDate(value);
    return parsed ?? value;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatMdY(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y.slice(-2)}`;
}

export function parseLooseDate(raw: string): string | null {
  const t = raw.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return t;
  const us = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!us) return null;
  const month = us[1].padStart(2, "0");
  const day = us[2].padStart(2, "0");
  let year = us[3];
  if (year.length === 2) {
    const n = Number(year);
    year = String(n >= 70 ? 1900 + n : 2000 + n);
  }
  return `${year}-${month}-${day}`;
}

export function fridayOfWeek(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const delta = day === 6 ? -1 : 5 - day;
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}

export function parseMoney(raw: string) {
  const neg = /\(.*\)|-/.test(raw);
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

export async function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file: Blob, maxEdge = 1800, quality = 0.84) {
  let source: Blob = file;
  const heic = isHeicBlob(file);
  if (heic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality });
      source = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      // conversion failed — loadImage below will throw if the browser cannot read it
    }
  }
  if (!source.type.startsWith("image/") && !heic) {
    return fileToDataUrl(file);
  }
  const url = URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToDataUrl(source);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function isHeicBlob(file: Blob) {
  const name = file instanceof File ? file.name : "";
  return /\.hei[cf]$/i.test(name) || file.type === "image/heic" || file.type === "image/heif";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}

export function dataUrlToUint8(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function extFromMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}
