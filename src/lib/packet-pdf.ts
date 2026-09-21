import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { isCoded, reportTotal, type Charge, type VisaReport } from "./types";
import { assetUrl, dataUrlToUint8, formatMdY, formatMoney } from "./utils";

const NAVY = rgb(0.071, 0.208, 0.357);
const INK = rgb(0.11, 0.12, 0.14);
const RULE = rgb(0.45, 0.45, 0.48);
const LIGHT = rgb(0.93, 0.93, 0.94);
const OR_RED = rgb(0.706, 0.137, 0.094);

const LANDSCAPE: [number, number] = [792, 612];
const PORTRAIT: [number, number] = [612, 792];

type Fonts = {
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

export async function buildPacketPdf(report: VisaReport) {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  if (report.statementDataUrl) {
    await appendPdfOrImage(doc, report.statementDataUrl, report.statementName);
  }

  await drawExpenseForm(doc, fonts, report);

  const withReceipts = report.charges.filter((c) => c.receipts.length > 0);
  for (const charge of withReceipts) {
    for (const receipt of charge.receipts) {
      await drawReceiptPage(doc, fonts, charge, receipt.dataUrl, receipt.name, receipt.mime);
    }
  }

  const missing = report.charges.filter((c) => c.receipts.length === 0);
  if (missing.length && withReceipts.length === 0 && !report.statementDataUrl) {
    // keep a one-page packet (the form) even without extras
  }

  return doc.save();
}

async function appendPdfOrImage(doc: PDFDocument, dataUrl: string, name: string) {
  const bytes = dataUrlToUint8(dataUrl);
  const isPdf =
    name.toLowerCase().endsWith(".pdf") ||
    dataUrl.startsWith("data:application/pdf") ||
    bytes[0] === 0x25;
  if (isPdf) {
    try {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await doc.copyPages(src, src.getPageIndices());
      for (const p of pages) doc.addPage(p);
      return;
    } catch {
      /* fall through and try as image */
    }
  }
  await drawReceiptPage(
    doc,
    {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
    },
    null,
    dataUrl,
    name,
    "image/jpeg",
  );
}

let cachedLogoBytes: Uint8Array | null = null;

async function embedStxLogo(doc: PDFDocument) {
  try {
    if (!cachedLogoBytes) {
      const res = await fetch(assetUrl("stx-logo-pdf.png"));
      if (!res.ok) return null;
      cachedLogoBytes = new Uint8Array(await res.arrayBuffer());
    }
    return await doc.embedPng(cachedLogoBytes);
  } catch {
    return null;
  }
}

async function drawExpenseForm(doc: PDFDocument, fonts: Fonts, report: VisaReport) {
  const page = doc.addPage(LANDSCAPE);
  const margin = 28;
  const width = LANDSCAPE[0] - margin * 2;
  const logo = await embedStxLogo(doc);
  const headerBand = logo ? 56 : 28;
  let y = LANDSCAPE[1] - 12;

  if (logo) {
    const maxH = 48;
    const maxW = 168;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo, {
      x: margin,
      y: y - h,
      width: w,
      height: h,
    });
  }

  page.drawText("VISA CARD EXPENSE SUMMARY", {
    x: 250,
    y: y - 22,
    size: 14,
    font: fonts.bold,
    color: INK,
  });
  page.drawText("Week Ending:", {
    x: 620,
    y: y - 18,
    size: 9,
    font: fonts.regular,
    color: INK,
  });
  const week = report.weekEnding ? formatMdY(report.weekEnding) : "";
  page.drawText(week, {
    x: 690,
    y: y - 20,
    size: 11,
    font: fonts.bold,
    color: rgb(0.7, 0.12, 0.1),
  });
  page.drawLine({
    start: { x: 688, y: y - 23 },
    end: { x: 764, y: y - 23 },
    thickness: 0.8,
    color: INK,
  });

  y -= headerBand;
  const headerH = 28;
  const colsHeader = [
    { w: 210, label: "Employee Name" },
    { w: 210, label: report.employeeName || " " },
    { w: 110, label: "Last 4 Card #'s" },
    { w: 70, label: report.last4 || " " },
    { w: 86, label: "Total Expenses" },
    { w: 50, label: formatMoney(reportTotal(report)) },
  ];
  drawHeaderRow(page, fonts, margin, y - headerH, colsHeader, headerH);
  y -= headerH;

  const col = columnLayout(width);
  const subH = 22;
  drawColumnHead(page, fonts, margin, y - subH, col, subH);
  y -= subH;

  const rows = padRows(report.charges, 14);
  const rowH = (y - margin - 8) / rows.length;
  rows.forEach((charge, i) => {
    const top = y - i * rowH;
    drawChargeRow(page, fonts, margin, top - rowH, rowH, col, charge, i);
  });
}

type Col = {
  date: number;
  vendor: number;
  desc: number;
  equip: number;
  or: number;
  job: number;
  code: number;
  amount: number;
};

function columnLayout(width: number): Col {
  const date = 72;
  const vendor = 128;
  const orw = 22;
  const equip = 78;
  const job = 78;
  const code = 72;
  const amount = 64;
  const desc = width - (date + vendor + orw + equip + job + code + amount);
  return { date, vendor, desc, equip, or: orw, job, code, amount };
}

function colXs(x: number, col: Col) {
  const date = x;
  const vendor = date + col.date;
  const desc = vendor + col.vendor;
  const equip = desc + col.desc;
  const or = equip + col.equip;
  const job = or + col.or;
  const code = job + col.job;
  const amount = code + col.code;
  return { date, vendor, desc, equip, or, job, code, amount, end: amount + col.amount };
}

function drawColumnHead(page: PDFPage, fonts: Fonts, x: number, y: number, col: Col, h: number) {
  const xs = colXs(x, col);
  page.drawRectangle({
    x,
    y,
    width: xs.end - x,
    height: h,
    borderColor: RULE,
    borderWidth: 0.8,
    color: LIGHT,
  });
  const labels: Array<[number, number, string]> = [
    [xs.date, col.date, "Purchase Date"],
    [xs.vendor, col.vendor, "Vendor"],
    [xs.desc, col.desc, "Detailed Description"],
    [xs.equip, col.equip, "Equip Number"],
    [xs.job, col.job, "Job Number"],
    [xs.code, col.code, "Cost Code"],
    [xs.amount, col.amount, "Amount"],
  ];
  for (const [cx, cw, label] of labels) {
    page.drawLine({
      start: { x: cx, y },
      end: { x: cx, y: y + h },
      thickness: 0.6,
      color: RULE,
    });
    const size = 7.5;
    const tw = fonts.bold.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: cx + Math.max(3, (cw - tw) / 2),
      y: y + h / 2 - 3,
      size,
      font: fonts.bold,
      color: INK,
    });
  }
  page.drawText("or", {
    x: xs.or + 4,
    y: y + h / 2 - 3,
    size: 8,
    font: fonts.bold,
    color: OR_RED,
  });
  page.drawLine({
    start: { x: xs.or, y },
    end: { x: xs.or, y: y + h },
    thickness: 0.6,
    color: RULE,
  });
  page.drawLine({
    start: { x: xs.end, y },
    end: { x: xs.end, y: y + h },
    thickness: 0.8,
    color: RULE,
  });
}

function drawChargeRow(
  page: PDFPage,
  fonts: Fonts,
  x: number,
  y: number,
  h: number,
  col: Col,
  charge: Charge | null,
  _i: number,
) {
  const xs = colXs(x, col);
  page.drawRectangle({
    x,
    y,
    width: xs.end - x,
    height: h,
    borderColor: RULE,
    borderWidth: 0.6,
  });
  const splits = [xs.vendor, xs.desc, xs.equip, xs.or, xs.job, xs.code, xs.amount, xs.end];
  for (const sx of splits) {
    page.drawLine({
      start: { x: sx, y },
      end: { x: sx, y: y + h },
      thickness: 0.55,
      color: RULE,
    });
  }
  page.drawText("or", {
    x: xs.or + 4,
    y: y + h / 2 - 3,
    size: 7,
    font: fonts.regular,
    color: OR_RED,
  });
  if (!charge) return;

  const size = 8;
  const mid = y + h / 2 - 3;
  const write = (text: string, cx: number, cw: number, align: "left" | "center" | "right" = "left") => {
    const t = fit(fonts.regular, text, size, cw - 8);
    const tw = fonts.regular.widthOfTextAtSize(t, size);
    let tx = cx + 4;
    if (align === "center") tx = cx + (cw - tw) / 2;
    if (align === "right") tx = cx + cw - tw - 5;
    page.drawText(t, { x: tx, y: mid, size, font: fonts.regular, color: INK });
  };

  write(charge.transDate ? formatMdY(charge.transDate) : "", xs.date, col.date, "center");
  write(charge.vendor, xs.vendor, col.vendor);
  write(charge.description, xs.desc, col.desc);

  const equip =
    charge.kind === "equipment"
      ? `${charge.equipNumber.trim()}${charge.equipSuffix}`.toUpperCase()
      : "";
  const job = charge.kind === "equipment" ? "" : charge.jobNumber;
  const code = charge.kind === "equipment" ? "" : charge.costCode;

  write(equip, xs.equip, col.equip, "center");
  write(job, xs.job, col.job, "center");
  write(code, xs.code, col.code, "center");
  if (charge.amount) write(formatMoney(charge.amount), xs.amount, col.amount, "right");
}

function drawHeaderRow(
  page: PDFPage,
  fonts: Fonts,
  x: number,
  y: number,
  cols: { w: number; label: string }[],
  h: number,
) {
  let cx = x;
  for (const col of cols) {
    page.drawRectangle({
      x: cx,
      y,
      width: col.w,
      height: h,
      borderColor: RULE,
      borderWidth: 0.8,
    });
    const size = 8;
    const tw = fonts.bold.widthOfTextAtSize(col.label, size);
    page.drawText(col.label, {
      x: cx + Math.max(4, (col.w - tw) / 2),
      y: y + h / 2 - 3,
      size,
      font: fonts.bold,
      color: INK,
    });
    cx += col.w;
  }
}

function padRows(charges: Charge[], min: number) {
  const filled = charges.filter((c) => c.vendor || c.amount || isCoded(c));
  const rows: Array<Charge | null> = [...filled];
  while (rows.length < min) rows.push(null);
  return rows;
}

function fit(font: Fonts["regular"], text: string, size: number, max: number) {
  if (!text) return "";
  if (font.widthOfTextAtSize(text, size) <= max) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
  return `${t}…`;
}

async function drawReceiptPage(
  doc: PDFDocument,
  fonts: Fonts,
  charge: Charge | null,
  dataUrl: string,
  name: string,
  mime: string,
) {
  const bytes = dataUrlToUint8(dataUrl);
  const isPdf = mime.includes("pdf") || name.toLowerCase().endsWith(".pdf") || bytes[0] === 0x25;
  if (isPdf) {
    try {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await doc.copyPages(src, src.getPageIndices());
      for (const p of pages) doc.addPage(p);
      return;
    } catch {
      /* try image */
    }
  }

  const page = doc.addPage(PORTRAIT);
  const caption = charge
    ? `RECEIPT  ·  ${charge.vendor}  ·  ${charge.transDate ? formatMdY(charge.transDate) : ""}  ·  ${formatMoney(charge.amount)}${charge.description ? `  ·  ${charge.description}` : ""}`
    : name;
  page.drawText(caption.slice(0, 110), {
    x: 36,
    y: 760,
    size: 9,
    font: fonts.bold,
    color: NAVY,
  });
  page.drawLine({
    start: { x: 36, y: 754 },
    end: { x: 576, y: 754 },
    thickness: 0.8,
    color: NAVY,
  });

  const box = { x: 36, y: 36, w: 540, h: 708 };
  try {
    const img = mime.includes("png")
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes);
    const scale = Math.min(box.w / img.width, box.h / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, {
      x: box.x + (box.w - w) / 2,
      y: box.y + (box.h - h) / 2,
      width: w,
      height: h,
    });
  } catch {
    page.drawText("Receipt could not be embedded. Re-save as JPG or PDF.", {
      x: 72,
      y: 400,
      size: 11,
      font: fonts.regular,
      color: INK,
    });
  }
}

export function missingPacketNotes(report: VisaReport) {
  const notes: string[] = [];
  const uncoded = report.charges.filter((c) => !isCoded(c));
  if (uncoded.length) notes.push(`${uncoded.length} charge${uncoded.length === 1 ? "" : "s"} still need coding`);
  const noReceipt = report.charges.filter((c) => c.receipts.length === 0);
  if (noReceipt.length) notes.push(`${noReceipt.length} missing receipt${noReceipt.length === 1 ? "" : "s"}`);
  if (!report.weekEnding) notes.push("Week ending date is blank");
  if (!report.employeeName) notes.push("Employee name is blank");
  if (!report.last4) notes.push("Last 4 of card is blank");
  if (!report.statementDataUrl) notes.push("No statement attached");
  return notes;
}
