import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Download, FilePlus2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChargePanel } from "@/components/charge-panel";
import { FormPreview } from "@/components/form-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseReceiptAi, parseStatementAi } from "@/lib/ai";
import { buildPacketPdf, missingPacketNotes } from "@/lib/packet-pdf";
import { extractPdfText, parseStatementText, renderPdfPages } from "@/lib/parse-statement";
import { useReport, useVisaStore } from "@/lib/store";
import { emptyCharge, isCoded, packetFileName, reportTotal, type ChargeKind } from "@/lib/types";
import { fileToDataUrl, formatMdY, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/reports/$id")({ component: ReportPage });

export function ReportPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const hydrated = useVisaStore((s) => s.hydrated);
  const setHydrated = useVisaStore((s) => s.setHydrated);
  const report = useReport(id);
  const settings = useVisaStore((s) => s.settings);
  const updateReport = useVisaStore((s) => s.updateReport);
  const addCharge = useVisaStore((s) => s.addCharge);
  const updateCharge = useVisaStore((s) => s.updateCharge);
  const removeCharge = useVisaStore((s) => s.removeCharge);
  const applyKind = useVisaStore((s) => s.applyKind);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    const unsub = useVisaStore.persist.onFinishHydration(() => setHydrated());
    if (useVisaStore.persist.hasHydrated()) setHydrated();
    return unsub;
  }, [setHydrated]);

  const active = useMemo(() => {
    if (!report) return undefined;
    return report.charges.find((c) => c.id === (activeId ?? report.charges[0]?.id));
  }, [report, activeId]);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-paper-2" />
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <p className="text-muted">That week is not on this device.</p>
        <Link to="/" className="mt-3 inline-block text-sm text-steel">
          Back to packets
        </Link>
      </AppShell>
    );
  }

  const coded = report.charges.filter(isCoded).length;
  const current = report;

  async function onStatement(file: File) {
    setError("");
    setBusy("Reading statement…");
    try {
      const dataUrl = await fileToDataUrl(file);
      updateReport(id, { statementName: file.name, statementDataUrl: dataUrl });
      let text = "";
      try {
        text = await extractPdfText(file, dataUrl);
      } catch (err) {
        console.warn("statement text extract failed", err);
        setError("Statement is attached. Couldn’t auto-read the charges — add them by hand.");
        return;
      }
      let parsed = parseStatementText(text);
      if (parsed.charges.length === 0 && import.meta.env.VITE_SPA !== "true") {
        setBusy("Reading statement with AI…");
        const pages = await renderPdfPages(file, 2, 1.2);
        const payload = pages.map((p) => splitDataUrl(p));
        const ai = await parseStatementAi({ data: { pages: payload } });
        if (ai.ok) {
          parsed = {
            employeeName: ai.data.employeeName,
            last4: ai.data.last4,
            closingDate: ai.data.closingDate,
            rawText: text,
            charges: ai.data.charges.map((c) =>
              emptyCharge({
                transDate: c.transDate,
                postDate: c.postDate,
                vendor: c.vendor,
                orderNo: c.orderNo,
                amount: c.amount,
                description: c.description,
              }),
            ),
          };
        }
      }
      updateReport(id, {
        employeeName: parsed.employeeName || current.employeeName,
        last4: parsed.last4 || current.last4,
        weekEnding: parsed.closingDate || current.weekEnding,
        charges: parsed.charges.length ? parsed.charges : current.charges,
      });
      if (parsed.charges[0]) setActiveId(parsed.charges[0].id);
      if (!parsed.charges.length) {
        setError("Statement is attached. Add each charge below if they didn’t fill in automatically.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that statement");
    } finally {
      setBusy("");
    }
  }

  async function onReadReceipt(receiptId: string) {
    if (!active) return;
    const rec = active.receipts.find((r) => r.id === receiptId);
    if (!rec) return;
    setBusy("Reading receipt…");
    setError("");
    try {
      const img = splitDataUrl(rec.dataUrl);
      const ai = await parseReceiptAi({ data: { image: img } });
      if (!ai.ok) throw new Error(ai.error);
      updateCharge(id, active.id, {
        vendor: ai.data.vendor || active.vendor,
        transDate: ai.data.date || active.transDate,
        amount: ai.data.amount || active.amount,
        description: ai.data.description || active.description,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read receipt");
    } finally {
      setBusy("");
    }
  }

  async function downloadPacket() {
    setNotes(missingPacketNotes(current));
    setBusy("Building PDF…");
    setError("");
    try {
      const bytes = await buildPacketPdf(current);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const blob = new Blob([copy], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = packetFileName(current);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the packet");
    } finally {
      setBusy("");
    }
  }

  return (
    <AppShell
      actions={
        <Button size="sm" onClick={() => void downloadPacket()} disabled={Boolean(busy)}>
          <Download /> Packet PDF
        </Button>
      }
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="text-xs font-medium tracking-wide text-steel uppercase">
            All packets
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-navy">
            {report.weekEnding ? `Week ending ${formatMdY(report.weekEnding)}` : "New week"}
          </h1>
          <p className="text-sm text-muted">
            {coded}/{report.charges.length || 0} coded · {formatMoney(reportTotal(report))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const c = addCharge(id);
              if (c) setActiveId(c.id);
            }}
          >
            <Plus /> Add charge
          </Button>
          <Button onClick={() => void downloadPacket()} disabled={Boolean(busy)}>
            <Download /> Download packet
          </Button>
        </div>
      </div>

      {busy ? (
        <p className="mb-4 rounded-md bg-paper-2 px-3 py-2 text-sm text-navy">{busy}</p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}
      {notes.length ? (
        <ul className="mb-4 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <section className="mb-6 grid gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:grid-cols-4">
        <label className="space-y-1.5">
          <Label>Employee</Label>
          <Input
            value={report.employeeName}
            onChange={(e) => updateReport(id, { employeeName: e.target.value })}
          />
        </label>
        <label className="space-y-1.5">
          <Label>Last 4</Label>
          <Input
            value={report.last4}
            maxLength={4}
            className="font-mono"
            onChange={(e) => updateReport(id, { last4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </label>
        <label className="space-y-1.5">
          <Label>Week ending</Label>
          <Input
            type="date"
            value={report.weekEnding}
            onChange={(e) => updateReport(id, { weekEnding: e.target.value })}
          />
        </label>
        <label className="space-y-1.5">
          <Label>Synovus statement</Label>
          <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-dashed border-line-strong bg-paper text-sm text-muted hover:bg-paper-2">
            {report.statementName ? "Replace PDF" : "Upload PDF"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onStatement(file);
                e.target.value = "";
              }}
            />
          </label>
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {report.charges.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted">
              Upload a statement or add a charge to start coding.
            </div>
          ) : (
            report.charges.map((c) => {
              const on = active?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left ${
                    on ? "border-navy bg-navy text-primary-foreground" : "border-line bg-card hover:bg-paper-2"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.vendor || "Untitled"}</span>
                    <span className="font-mono text-xs tabular-nums">{formatMoney(c.amount)}</span>
                  </div>
                  <div
                    className={`mt-1 flex items-center justify-between text-[11px] ${
                      on ? "text-primary-foreground/70" : "text-muted"
                    }`}
                  >
                    <span>{c.transDate ? formatMdY(c.transDate) : "No date"}</span>
                    <span>{isCoded(c) ? "Coded" : "Open"}</span>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-6">
          {active ? (
            <>
              <div className="mb-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const idx = report.charges.findIndex((c) => c.id === active.id);
                    removeCharge(id, active.id);
                    const next = report.charges[idx + 1] ?? report.charges[idx - 1];
                    setActiveId(next?.id ?? null);
                  }}
                >
                  <Trash2 /> Remove charge
                </Button>
              </div>
              <ChargePanel
                charge={active}
                settings={settings}
                busyRead={busy.includes("receipt")}
                onPatch={(patch) => updateCharge(id, active.id, patch)}
                onKind={(kind: ChargeKind) => applyKind(id, active.id, kind)}
                onReceiptError={setError}
                onReadReceipt={
                  import.meta.env.VITE_SPA === "true" ? undefined : (rid) => void onReadReceipt(rid)
                }
              />
            </>
          ) : (
            <div className="py-12 text-center">
              <FilePlus2 className="mx-auto size-8 text-subtle" />
              <p className="mt-3 text-sm text-muted">Add a charge or drop a statement.</p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-navy">Packet preview</h2>
          <Badge tone="navy">Expense summary</Badge>
        </div>
        <FormPreview report={report} />
        <p className="mt-3 max-w-2xl text-xs text-muted">
          Downloaded PDF order: original statement, this summary (landscape, matching the STX
          form), then each receipt on its own page at full size so it stays legible.
        </p>
      </section>
    </AppShell>
  );
}

function splitDataUrl(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, comma);
  const mime = header.slice(5, header.indexOf(";")) || "image/jpeg";
  return { mime, b64: dataUrl.slice(comma + 1) };
}
