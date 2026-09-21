import { Camera, FileUp, Trash2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import type { Receipt } from "@/lib/types";
import { compressImage, extFromMime, uid } from "@/lib/utils";
import { Button } from "./ui/button";

export function ReceiptDrop({
  receipts,
  onChange,
  onRead,
  onError,
  busy,
}: {
  receipts: Receipt[];
  onChange: (next: Receipt[]) => void;
  onRead?: (receipt: Receipt) => void;
  onError?: (message: string) => void;
  busy?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  async function ingest(files: FileList | File[]) {
    const list = Array.from(files);
    const added: Receipt[] = [];
    const failed: string[] = [];
    for (const file of list) {
      if (file.size > 12_000_000) {
        failed.push(`${file.name || "that file"} (too large)`);
        continue;
      }
      try {
        const mime = file.type || guessMime(file.name);
        const treatAsImage = mime.startsWith("image/") || /\.hei[cf]$/i.test(file.name);
        const dataUrl = treatAsImage ? await compressImage(file) : await blobDataUrl(file);
        const storedMime = dataUrl.startsWith("data:image/")
          ? dataUrl.slice(5, dataUrl.indexOf(";")) || "image/jpeg"
          : mime;
        added.push({
          id: uid(),
          name: file.name || `receipt.${extFromMime(storedMime)}`,
          mime: storedMime,
          dataUrl,
        });
      } catch {
        failed.push(file.name || "that file");
      }
    }
    if (added.length) onChange([...receipts, ...added]);
    if (failed.length) {
      onError?.(
        `Couldn't read ${failed.join(", ")}. Try again, or take a photo instead of picking one from your library.`,
      );
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
        }}
        className={`rounded-lg border border-dashed px-3 py-4 text-center ${
          drag ? "border-navy bg-paper-2" : "border-line-strong bg-card"
        }`}
      >
        <p className="text-sm text-muted">Drop a receipt photo or PDF — keep it large and readable</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <FileUp /> Upload
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => camRef.current?.click()}>
            <Camera /> Take photo
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void ingest(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void ingest(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {receipts.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 rounded-md border border-line bg-card p-2"
        >
          {r.mime.startsWith("image/") ? (
            <img
              src={r.dataUrl}
              alt={r.name}
              className="size-14 rounded-sm object-cover outline outline-1 -outline-offset-1 outline-navy/15"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-sm bg-paper-2 font-mono text-[10px] text-muted">
              PDF
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{r.name}</p>
            <p className="text-xs text-muted">Stays full-page in the packet</p>
          </div>
          {onRead && r.mime.startsWith("image/") ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy}
              onClick={() => onRead(r)}
              aria-label="Read receipt"
            >
              <Sparkles />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove receipt"
            onClick={() => onChange(receipts.filter((x) => x.id !== r.id))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}

function guessMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function blobDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
