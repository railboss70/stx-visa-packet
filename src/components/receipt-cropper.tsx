import { Check, RotateCcw, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

type Rect = { x: number; y: number; w: number; h: number };
type HandleId = "nw" | "ne" | "sw" | "se";
type DragMode = "move" | HandleId;

const MIN_SIZE = 0.12;
const DEFAULT_RECT: Rect = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
const HANDLES: Array<{ id: HandleId; left: "x" | "x2"; top: "y" | "y2" }> = [
  { id: "nw", left: "x", top: "y" },
  { id: "ne", left: "x2", top: "y" },
  { id: "sw", left: "x", top: "y2" },
  { id: "se", left: "x2", top: "y2" },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Modal crop box so a guy can trim the desk out of a receipt photo
 * before it goes in the packet.
 */
export function ReceiptCropper({
  open,
  dataUrl,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  dataUrl: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect>(DEFAULT_RECT);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; start: Rect } | null>(null);

  useEffect(() => {
    if (!open) return;
    setRect(DEFAULT_RECT);
    setNatural(null);
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = dataUrl;
  }, [open, dataUrl]);

  function pointFromEvent(e: ReactPointerEvent) {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const b = stage.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
  }

  function beginDrag(mode: DragMode) {
    return (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      const p = pointFromEvent(e);
      dragRef.current = { mode, startX: p.x, startY: p.y, start: rect };
    };
  }

  function onDragMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    const s = drag.start;
    if (drag.mode === "move") {
      setRect({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) });
      return;
    }
    let { x, y, w, h } = s;
    if (drag.mode === "nw" || drag.mode === "sw") {
      const nx = clamp(s.x + dx, 0, s.x + s.w - MIN_SIZE);
      w = s.w + (s.x - nx);
      x = nx;
    }
    if (drag.mode === "ne" || drag.mode === "se") {
      w = clamp(s.w + dx, MIN_SIZE, 1 - s.x);
    }
    if (drag.mode === "nw" || drag.mode === "ne") {
      const ny = clamp(s.y + dy, 0, s.y + s.h - MIN_SIZE);
      h = s.h + (s.y - ny);
      y = ny;
    }
    if (drag.mode === "sw" || drag.mode === "se") {
      h = clamp(s.h + dy, MIN_SIZE, 1 - s.y);
    }
    setRect({ x, y, w, h });
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
  }

  function confirm() {
    if (!natural || !imgRef.current) return;
    const sx = Math.round(rect.x * natural.w);
    const sy = Math.round(rect.y * natural.h);
    const sw = Math.round(rect.w * natural.w);
    const sh = Math.round(rect.h * natural.h);
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(sw, sh, 1));
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, dw, dh);
    onConfirm(canvas.toDataURL("image/jpeg", 0.88));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Crop receipt</DialogTitle>
        <DialogDescription>Drag the corner dots so just the receipt is inside the box.</DialogDescription>
        <div
          ref={stageRef}
          className="relative mx-auto max-h-[60vh] w-full touch-none select-none overflow-hidden rounded-md bg-paper-2"
          style={{ aspectRatio: natural ? `${natural.w} / ${natural.h}` : "3 / 4" }}
        >
          <img
            ref={imgRef}
            src={dataUrl}
            alt="Receipt to crop"
            className="pointer-events-none absolute inset-0 size-full object-contain"
            draggable={false}
          />
          {natural ? (
            <div
              onPointerDown={beginDrag("move")}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="absolute cursor-move border-2 border-white"
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`,
                height: `${rect.h * 100}%`,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              }}
            >
              {HANDLES.map((h) => (
                <div
                  key={h.id}
                  onPointerDown={beginDrag(h.id)}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute flex size-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-none items-center justify-center"
                  style={{
                    left: h.left === "x" ? 0 : "100%",
                    top: h.top === "y" ? 0 : "100%",
                  }}
                >
                  <div className="size-4 rounded-full border-2 border-navy bg-white shadow" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">Loading…</div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRect(DEFAULT_RECT)}>
            <RotateCcw /> Reset
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              <XIcon /> Cancel
            </Button>
            <Button type="button" size="sm" onClick={confirm} disabled={!natural}>
              <Check /> Use crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
