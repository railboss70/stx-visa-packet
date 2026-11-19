import { Check, RotateCcw, ScanLine, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { scanLook, warpQuad, type Pt } from "@/lib/scan";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

// Corners as fractions of the photo: top-left, top-right, bottom-right, bottom-left.
const DEFAULT_CORNERS: Pt[] = [
  { x: 0.05, y: 0.05 },
  { x: 0.95, y: 0.05 },
  { x: 0.95, y: 0.95 },
  { x: 0.05, y: 0.95 },
];
const CORNER_LABELS = ["Top left corner", "Top right corner", "Bottom right corner", "Bottom left corner"];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function validCorners(c: Pt[] | undefined) {
  return Array.isArray(c) && c.length === 4 && c.every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y));
}

/**
 * Crop like a scanner app: drag each of the four corner dots onto the corners of
 * the receipt (each moves on its own), and the receipt is straightened into a flat
 * page. "Scan look" whitens the paper and darkens the print.
 */
export function ReceiptCropper({
  open,
  dataUrl,
  initial,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  dataUrl: string;
  initial?: { corners: Pt[]; scan: boolean };
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string, crop: { corners: Pt[]; scan: boolean }) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [corners, setCorners] = useState<Pt[]>(DEFAULT_CORNERS);
  const [scan, setScan] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ i: number; offX: number; offY: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setCorners(validCorners(initial?.corners) ? initial!.corners.map((p) => ({ ...p })) : DEFAULT_CORNERS);
    setScan(initial ? initial.scan : true);
    setNatural(null);
    setBox(null);
    setSaving(false);
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = dataUrl;
  }, [open, dataUrl, initial]);

  // Size the stage to the rendered photo in px so corner fractions map 1:1.
  useEffect(() => {
    if (!open || !natural) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const compute = () => {
      const availW = wrap.clientWidth;
      const availH = window.innerHeight * 0.58;
      const scale = Math.min(availW / natural.w, availH / natural.h);
      setBox({ w: Math.max(1, Math.round(natural.w * scale)), h: Math.max(1, Math.round(natural.h * scale)) });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, [open, natural]);

  function pointFromEvent(e: ReactPointerEvent) {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const b = stage.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
  }

  function beginDrag(i: number) {
    return (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      const p = pointFromEvent(e);
      // Keep the finger's offset so the dot doesn't jump under the thumb.
      dragRef.current = { i, offX: corners[i].x - p.x, offY: corners[i].y - p.y };
      setActive(i);
    };
  }

  function onDragMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    const x = clamp(p.x + drag.offX, 0, 1);
    const y = clamp(p.y + drag.offY, 0, 1);
    setCorners((prev) => prev.map((c, i) => (i === drag.i ? { x, y } : c)));
  }

  function endDrag(e: ReactPointerEvent) {
    if (dragRef.current) {
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        /* pointer capture already released */
      }
    }
    dragRef.current = null;
    setActive(null);
  }

  async function confirm() {
    if (!natural || !imgRef.current) return;
    setSaving(true);
    // Let the "Saving…" label paint before the heavy pixel work.
    await new Promise((r) => setTimeout(r, 30));
    try {
      const px = corners.map((c) => ({ x: c.x * natural.w, y: c.y * natural.h }));
      const canvas = warpQuad(imgRef.current, px, 1800);
      if (scan) scanLook(canvas);
      onConfirm(canvas.toDataURL("image/jpeg", 0.88), { corners: corners.map((c) => ({ ...c })), scan });
    } catch {
      setSaving(false);
    }
  }

  const poly = corners.map((c) => `${c.x},${c.y}`).join(" ");
  const holePath = `M0,0 H1 V1 H0 Z M${corners.map((c) => `${c.x},${c.y}`).join(" L")} Z`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Crop and scan receipt</DialogTitle>
        <DialogDescription>
          Drag each corner dot onto a corner of the receipt. Each dot moves on its own, so a tilted
          or angled receipt comes out straight.
        </DialogDescription>
        <div ref={wrapRef} className="flex max-h-[58vh] w-full items-center justify-center">
          <div
            ref={stageRef}
            className="relative touch-none select-none overflow-visible rounded-md bg-paper-2"
            style={box ? { width: box.w, height: box.h } : { width: "100%", height: "58vh" }}
          >
            <img
              ref={imgRef}
              src={dataUrl}
              alt="Receipt to crop"
              className="pointer-events-none absolute inset-0 size-full rounded-md object-contain"
              draggable={false}
            />
            {natural && box ? (
              <>
                <svg
                  className="pointer-events-none absolute inset-0 size-full"
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d={holePath} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
                  <polygon
                    points={poly}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                {corners.map((c, i) => (
                  <div
                    key={i}
                    role="slider"
                    aria-label={CORNER_LABELS[i]}
                    aria-valuetext={`${Math.round(c.x * 100)}% across, ${Math.round(c.y * 100)}% down`}
                    onPointerDown={beginDrag(i)}
                    onPointerMove={onDragMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="absolute flex size-12 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center"
                    style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                  >
                    <div
                      className={`rounded-full border-2 border-navy bg-white shadow ${active === i ? "size-6" : "size-5"}`}
                    />
                  </div>
                ))}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">Loading…</div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setScan((s) => !s)}
          aria-pressed={scan}
          className="flex w-full items-center gap-3 rounded-md border border-line bg-card px-3 py-2.5 text-left"
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-sm border-2 border-navy ${
              scan ? "bg-navy text-white" : "bg-white"
            }`}
          >
            {scan ? <Check className="size-4" /> : null}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-navy">
              <ScanLine className="size-4" /> Scan look
            </span>
            <span className="block text-xs text-muted">
              Whitens the paper, removes shadows and darkens the print so it reads like a scan.
            </span>
          </span>
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCorners(DEFAULT_CORNERS)}>
            <RotateCcw /> Reset corners
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              <XIcon /> Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void confirm()} disabled={!box || saving}>
              <Check /> {saving ? "Saving…" : "Use crop"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
